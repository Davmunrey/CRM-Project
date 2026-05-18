import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonError, jsonResponse } from '../_shared/edgeHttp.ts'
import { edgeLog, getRequestId } from '../_shared/requestLog.ts'
import { rateLimitHit } from '../_shared/rateLimit.ts'
import { withTraceLog } from '../_shared/tracing.ts'
import { getAnonKey } from '../_shared/supabase-keys.ts'

type Action = 'summarizeThread' | 'draftReply' | 'nextBestAction' | 'semanticSearch'

const CLAUDE_MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeRequest {
  model: string
  max_tokens: number
  system?: string
  messages: ClaudeMessage[]
}

interface ClaudeResponse {
  id: string
  content: Array<{ type: string; text: string }>
  usage: { input_tokens: number; output_tokens: number }
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  const body: ClaudeRequest = {
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`Anthropic API error ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as ClaudeResponse
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text content in Claude response')
  return textBlock.text
}

function buildPromptForAction(
  action: Action,
  payload: Record<string, unknown>,
): { system: string; user: string } {
  switch (action) {
    case 'summarizeThread': {
      const messages = (payload.messages as string[]) ?? []
      return {
        system:
          'You are a CRM assistant. Summarize email or conversation threads concisely for a sales rep. Focus on key decisions, action items, and relationship context. Keep it under 150 words.',
        user: `Summarize the following conversation thread:\n\n${messages.join('\n\n')}`,
      }
    }

    case 'draftReply': {
      const thread = (payload.thread as string) ?? ''
      const instructions = (payload.instructions as string) ?? 'Write a professional follow-up reply.'
      return {
        system:
          'You are a CRM assistant that drafts professional sales emails. Match the tone of the conversation. Be concise, clear, and action-oriented.',
        user: `Conversation thread:\n${thread}\n\nInstructions: ${instructions}\n\nDraft a reply:`,
      }
    }

    case 'nextBestAction': {
      const contactName = (payload.contactName as string) ?? 'the contact'
      const dealStage = (payload.dealStage as string) ?? 'unknown'
      const lastActivity = (payload.lastActivity as string) ?? 'no recent activity'
      const notes = (payload.notes as string) ?? ''
      return {
        system:
          'You are a CRM sales coach. Given the deal context, recommend a single, specific next best action for the sales rep. Be direct and practical.',
        user: `Contact: ${contactName}\nDeal stage: ${dealStage}\nLast activity: ${lastActivity}\nNotes: ${notes}\n\nWhat is the single best next action the rep should take?`,
      }
    }

    case 'semanticSearch': {
      const query = (payload.query as string) ?? ''
      const candidates = (payload.candidates as string[]) ?? []
      return {
        system:
          'You are a CRM assistant. Given a search query and a list of items, return the indices (0-based) of the most relevant items in JSON array format, e.g. [0, 2, 5]. Return only the JSON array, nothing else.',
        user: `Query: "${query}"\n\nCandidates:\n${candidates.map((c, i) => `${i}: ${c}`).join('\n')}\n\nReturn the indices of the most relevant results as a JSON array:`,
      }
    }

    default: {
      return {
        system: 'You are a helpful CRM assistant.',
        user: JSON.stringify(payload),
      }
    }
  }
}

Deno.serve(async (req) => withTraceLog(req, async (trace) => {
  const request_id = getRequestId(req)
  if (req.method !== 'POST') return jsonError('Method not allowed', 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = getAnonKey()
  const client = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return jsonError('Unauthorized', 401)

  const key = `ai:${user.id}`
  if (rateLimitHit(key, 20, 60_000)) return jsonError('Rate limited', 429)

  const body = await req.json().catch(() => ({})) as { action?: Action; payload?: Record<string, unknown> }
  const action = body.action
  if (!action) return jsonError('action is required', 400)

  const payload = body.payload ?? {}

  edgeLog({
    function: 'ai-orchestrator',
    level: 'info',
    msg: 'ai_request_start',
    request_id,
    action,
    user_id: user.id,
    traceparent: trace.traceparent,
  })

  try {
    const { system, user: userPrompt } = buildPromptForAction(action, payload)
    const text = await callClaude(system, userPrompt)

    edgeLog({
      function: 'ai-orchestrator',
      level: 'info',
      msg: 'ai_request_complete',
      request_id,
      action,
      user_id: user.id,
    })

    return jsonResponse({
      ok: true,
      request_id,
      action,
      result: { text },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    edgeLog({
      function: 'ai-orchestrator',
      level: 'error',
      msg: 'ai_request_failed',
      request_id,
      action,
      user_id: user.id,
      error: message,
    })

    return jsonError(`AI request failed: ${message}`, 500)
  }
}))
