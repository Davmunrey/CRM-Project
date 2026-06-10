/**
 * AI / agentic routes for n0CRM.
 *
 * Multi-provider (Gemini free default / OpenAI / Anthropic, see services/ai).
 * Every route is JWT-authenticated, org-scoped, and rate-limited tighter than
 * the global default because provider calls cost tokens. When no provider key
 * is configured the feature degrades gracefully: GET /ai/status reports
 * `enabled: false` and the action routes return 503 so the UI can hide/disable.
 */
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import {
  availableProviders,
  isAiConfigured,
  resolveProvider,
  AiError,
  type AiProvider,
  type AiMessage,
} from '../services/ai/providers.js'
import {
  runAgent,
  summarizeThread,
  draftReply,
  nextBestAction,
  semanticSearch,
} from '../services/ai/agent.js'
import { getTool, toolDefs, type ToolContext } from '../services/ai/tools.js'

// AI calls are expensive — cap at 30/min per org (the global default is 500/min).
const AI_RATE_LIMIT = { max: 30, timeWindow: '1 minute' }

/** Read an org's pinned AI provider from organizations.settings.ai.provider. */
async function orgProviderPreference(orgId: string): Promise<string | null> {
  const rows = await db`SELECT settings FROM organizations WHERE id = ${orgId} LIMIT 1`
  const settings = rows[0]?.['settings'] as { ai?: { provider?: string } } | undefined
  return settings?.ai?.provider ?? null
}

/** Resolve a provider for this org, or send 503 and return null. */
async function getProviderOr503(orgId: string, reply: FastifyReply): Promise<AiProvider | null> {
  if (!isAiConfigured()) {
    reply.code(503).send({ error: 'AI is not configured. Set GEMINI_API_KEY (free) or another provider key.' })
    return null
  }
  const preferred = await orgProviderPreference(orgId)
  const provider = resolveProvider(preferred)
  if (!provider) {
    reply.code(503).send({ error: 'No AI provider available' })
    return null
  }
  return provider
}

/** Best-effort token accounting; never blocks or fails the request. */
function logUsage(
  orgId: string,
  userId: string,
  provider: AiProvider,
  action: string,
  usage: { inputTokens: number; outputTokens: number },
): void {
  void db`
    INSERT INTO ai_usage_log (organization_id, user_id, provider, model, action, input_tokens, output_tokens)
    VALUES (${orgId}, ${userId}, ${provider.id}, ${provider.model}, ${action}, ${usage.inputTokens}, ${usage.outputTokens})
  `.catch(() => {
    /* usage logging is non-critical */
  })
}

function aiErrorReply(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AiError) return reply.code(err.statusCode).send({ error: err.message })
  const msg = err instanceof Error ? err.message : 'AI request failed'
  return reply.code(500).send({ error: msg })
}

const AGENT_SYSTEM = `You are n0CRM's AI sales assistant. You help sales reps work their pipeline.
- Use the provided tools to look up real CRM data (contacts, companies, deals, activities) instead of guessing. Never invent records, ids, numbers, or email addresses.
- When the user asks you to do something (log a call, schedule a follow-up, move a deal), use the write tools — but only if they are enabled. If a write tool reports that actions are disabled, tell the user to enable actions.
- Be concise and practical. Prefer specific, actionable answers over generic advice.
- All data is scoped to the user's organization; never reference other organizations.`

export async function aiRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate], config: { rateLimit: AI_RATE_LIMIT } }

  // ── Status (no provider required) ──────────────────────────────────────────
  app.get('/status', { onRequest: [app.authenticate] }, async () => {
    const providers = availableProviders()
    const enabled = providers.length > 0
    const provider = enabled ? resolveProvider(null) : null
    return {
      enabled,
      providers,
      defaultProvider: env.AI_DEFAULT_PROVIDER,
      activeProvider: provider?.id ?? null,
      model: provider?.model ?? null,
      maxSteps: env.AI_AGENT_MAX_STEPS,
    }
  })

  // ── Summarize a thread ─────────────────────────────────────────────────────
  app.post('/summarize', auth, async (req, reply) => {
    const body = z.object({ messages: z.array(z.string()).min(1).max(100) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const provider = await getProviderOr503(req.user.org, reply)
    if (!provider) return
    try {
      const { text, usage } = await summarizeThread(provider, body.data.messages)
      logUsage(req.user.org, req.user.sub, provider, 'summarize', usage)
      return reply.send({ text, provider: provider.id })
    } catch (err) {
      return aiErrorReply(reply, err)
    }
  })

  // ── Draft a reply ──────────────────────────────────────────────────────────
  app.post('/draft-reply', auth, async (req, reply) => {
    const body = z
      .object({
        thread: z.string().min(1).max(20_000),
        instructions: z.string().max(2000).default('Write a professional follow-up reply.'),
      })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const provider = await getProviderOr503(req.user.org, reply)
    if (!provider) return
    try {
      const { text, usage } = await draftReply(provider, body.data.thread, body.data.instructions)
      logUsage(req.user.org, req.user.sub, provider, 'draft_reply', usage)
      return reply.send({ text, provider: provider.id })
    } catch (err) {
      return aiErrorReply(reply, err)
    }
  })

  // ── Next best action (fetches CRM context server-side) ─────────────────────
  app.post('/next-best-action', auth, async (req, reply) => {
    const body = z
      .object({
        contactId: z.string().uuid().optional(),
        dealId: z.string().uuid().optional(),
      })
      .refine((d) => d.contactId || d.dealId, { message: 'contactId or dealId required' })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'contactId or dealId required' })
    const orgId = req.user.org
    const provider = await getProviderOr503(orgId, reply)
    if (!provider) return

    const context: Parameters<typeof nextBestAction>[1] = {}
    if (body.data.contactId) {
      const [c] = await db`
        SELECT first_name, last_name, status, notes, last_contacted_at
        FROM contacts WHERE id = ${body.data.contactId} AND organization_id = ${orgId} LIMIT 1
      `
      if (!c) return reply.code(404).send({ error: 'Contact not found' })
      context.contactName = `${c['firstName'] ?? ''} ${c['lastName'] ?? ''}`.trim()
      context.notes = (c['notes'] as string | null) ?? undefined
    }
    if (body.data.dealId) {
      const [d] = await db`
        SELECT title, stage, status, notes FROM deals
        WHERE id = ${body.data.dealId} AND organization_id = ${orgId} LIMIT 1
      `
      if (!d) return reply.code(404).send({ error: 'Deal not found' })
      context.dealTitle = d['title'] as string
      context.dealStage = d['stage'] as string
      context.dealStatus = d['status'] as string
      if (!context.notes) context.notes = (d['notes'] as string | null) ?? undefined
    }
    // Most recent activity for richer context.
    const linkId = body.data.dealId ?? body.data.contactId
    const linkCol = body.data.dealId ? 'deal_id' : 'contact_id'
    if (linkId) {
      const recent = await db`
        SELECT type, subject, created_at FROM activities
        WHERE organization_id = ${orgId} AND ${db(linkCol)} = ${linkId}
        ORDER BY created_at DESC LIMIT 1
      `
      if (recent[0]) context.lastActivity = `${recent[0]['type']}: ${recent[0]['subject']}`
    }

    try {
      const { text, usage } = await nextBestAction(provider, context)
      logUsage(orgId, req.user.sub, provider, 'next_best_action', usage)
      return reply.send({ text, provider: provider.id })
    } catch (err) {
      return aiErrorReply(reply, err)
    }
  })

  // ── Semantic search (AI re-ranks org-scoped candidates) ─────────────────────
  app.post('/search', auth, async (req, reply) => {
    const body = z
      .object({
        query: z.string().min(1).max(500),
        scope: z.enum(['contacts', 'deals']).default('contacts'),
        limit: z.coerce.number().min(1).max(20).default(8),
      })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const orgId = req.user.org
    const provider = await getProviderOr503(orgId, reply)
    if (!provider) return

    // Pull a bounded candidate pool to rank (newest 60).
    const pool =
      body.data.scope === 'deals'
        ? await db`
            SELECT id, title, stage, status, value, currency FROM deals
            WHERE organization_id = ${orgId} ORDER BY updated_at DESC LIMIT 60
          `
        : await db`
            SELECT id, first_name, last_name, email, job_title, status FROM contacts
            WHERE organization_id = ${orgId} ORDER BY updated_at DESC LIMIT 60
          `
    if (pool.length === 0) return reply.send({ results: [], provider: provider.id })

    const candidates = pool.map((r) =>
      body.data.scope === 'deals'
        ? `${r['title']} — ${r['stage']} / ${r['status']} (${r['value']} ${r['currency']})`
        : `${r['firstName'] ?? ''} ${r['lastName'] ?? ''} <${r['email'] ?? ''}> — ${r['jobTitle'] ?? ''} [${r['status'] ?? ''}]`,
    )
    try {
      const { indices, usage } = await semanticSearch(provider, body.data.query, candidates)
      logUsage(orgId, req.user.sub, provider, 'semantic_search', usage)
      const results = indices.slice(0, body.data.limit).map((i) => pool[i]).filter(Boolean)
      return reply.send({ results, provider: provider.id })
    } catch (err) {
      return aiErrorReply(reply, err)
    }
  })

  // ── Conversations list ──────────────────────────────────────────────────────
  app.get('/conversations', { onRequest: [app.authenticate] }, async (req) => {
    const rows = await db`
      SELECT id, title, created_at, updated_at FROM ai_conversations
      WHERE organization_id = ${req.user.org} AND user_id = ${req.user.sub}
      ORDER BY updated_at DESC LIMIT 50
    `
    return { data: rows }
  })

  app.get('/conversations/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const conv = await db`
      SELECT id, title FROM ai_conversations
      WHERE id = ${id} AND organization_id = ${req.user.org} AND user_id = ${req.user.sub} LIMIT 1
    `
    if (conv.length === 0) return reply.code(404).send({ error: 'Not found' })
    const messages = await db`
      SELECT id, role, content, steps, created_at FROM ai_messages
      WHERE conversation_id = ${id} AND organization_id = ${req.user.org}
      ORDER BY created_at ASC
    `
    return { conversation: conv[0], messages }
  })

  // ── Agent (tool-using loop, persisted conversation) ─────────────────────────
  app.post('/agent', auth, async (req, reply) => {
    const body = z
      .object({
        message: z.string().min(1).max(8000),
        conversationId: z.string().uuid().optional(),
        allowWrites: z.boolean().default(false),
      })
      .safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Invalid request' })
    const orgId = req.user.org
    const userId = req.user.sub
    const provider = await getProviderOr503(orgId, reply)
    if (!provider) return

    // Resolve or create the conversation, then load prior turns for context.
    let conversationId = body.data.conversationId
    const history: AiMessage[] = []
    if (conversationId) {
      const conv = await db`
        SELECT id FROM ai_conversations
        WHERE id = ${conversationId} AND organization_id = ${orgId} AND user_id = ${userId} LIMIT 1
      `
      if (conv.length === 0) return reply.code(404).send({ error: 'Conversation not found' })
      const prior = await db`
        SELECT role, content FROM ai_messages
        WHERE conversation_id = ${conversationId} AND organization_id = ${orgId}
          AND role IN ('user', 'assistant')
        ORDER BY created_at ASC LIMIT 40
      `
      for (const m of prior) {
        history.push({ role: m['role'] as 'user' | 'assistant', content: m['content'] as string })
      }
    } else {
      const title = body.data.message.slice(0, 80)
      const [created] = await db`
        INSERT INTO ai_conversations (organization_id, user_id, title)
        VALUES (${orgId}, ${userId}, ${title})
        RETURNING id
      `
      conversationId = created!['id'] as string
    }

    const ctx: ToolContext = { orgId, userId, allowWrites: body.data.allowWrites }
    const messages: AiMessage[] = [...history, { role: 'user', content: body.data.message }]

    try {
      const result = await runAgent(provider, {
        system: AGENT_SYSTEM,
        messages,
        tools: toolDefs(),
        maxSteps: env.AI_AGENT_MAX_STEPS,
        execute: async (call) => {
          const tool = getTool(call.name)
          if (!tool) return { error: `Unknown tool: ${call.name}` }
          return tool.execute(ctx, call.args)
        },
      })

      // Persist the user turn and the assistant turn (+ tool steps).
      await db`
        INSERT INTO ai_messages (conversation_id, organization_id, role, content)
        VALUES (${conversationId}, ${orgId}, 'user', ${body.data.message})
      `
      await db`
        INSERT INTO ai_messages (conversation_id, organization_id, role, content, steps)
        VALUES (${conversationId}, ${orgId}, 'assistant', ${result.text}, ${JSON.stringify(result.steps)})
      `
      await db`UPDATE ai_conversations SET updated_at = now() WHERE id = ${conversationId}`

      logUsage(orgId, userId, provider, 'agent', result.usage)
      return reply.send({
        conversationId,
        reply: result.text,
        steps: result.steps,
        stoppedReason: result.stoppedReason,
        provider: provider.id,
      })
    } catch (err) {
      return aiErrorReply(reply, err)
    }
  })
}
