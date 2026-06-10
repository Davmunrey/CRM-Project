/**
 * Tool-using agent loop + one-shot AI helpers.
 *
 * `runAgent` is provider- and tool-agnostic: the provider and a tool executor
 * are injected, so the loop is fully unit-testable with fakes (no DB, no
 * network). The route layer wires the real CRM tools + org context in.
 *
 * Guardrails: a hard `maxSteps` ceiling on tool-call rounds, tool errors are
 * captured and returned to the model (never thrown), and every executed tool
 * call is recorded in `steps` for transparency in the UI / audit.
 */
import type {
  AiChatResult,
  AiMessage,
  AiProvider,
  AiToolCall,
  AiToolDef,
  AiUsage,
} from './providers.js'

export interface AgentStep {
  tool: string
  args: Record<string, unknown>
  result: unknown
}

export interface AgentRunResult {
  text: string
  steps: AgentStep[]
  usage: AiUsage
  stepsTaken: number
  stoppedReason: 'final' | 'max_steps'
}

export interface RunAgentOptions {
  system: string
  /** Conversation so far (user/assistant turns). The loop appends to a copy. */
  messages: AiMessage[]
  tools: AiToolDef[]
  /** Executes one tool call and returns a JSON-serializable result. */
  execute: (call: AiToolCall) => Promise<unknown>
  maxSteps: number
  temperature?: number | undefined
  maxTokens?: number | undefined
  signal?: AbortSignal | undefined
}

export async function runAgent(provider: AiProvider, opts: RunAgentOptions): Promise<AgentRunResult> {
  const messages: AiMessage[] = [...opts.messages]
  const steps: AgentStep[] = []
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 }

  for (let step = 0; step < opts.maxSteps; step++) {
    const res: AiChatResult = await provider.chat(messages, {
      system: opts.system,
      tools: opts.tools,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal: opts.signal,
    })
    usage.inputTokens += res.usage.inputTokens
    usage.outputTokens += res.usage.outputTokens

    if (res.toolCalls.length === 0) {
      return { text: res.text, steps, usage, stepsTaken: step, stoppedReason: 'final' }
    }

    // Record the assistant's tool-call turn so the provider keeps coherent state.
    messages.push({ role: 'assistant', content: res.text, toolCalls: res.toolCalls })

    for (const call of res.toolCalls) {
      let result: unknown
      try {
        result = await opts.execute(call)
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) }
      }
      steps.push({ tool: call.name, args: call.args, result })
      messages.push({
        role: 'tool',
        name: call.name,
        toolCallId: call.id,
        content: JSON.stringify(result ?? null),
      })
    }
  }

  // Ran out of steps with a pending tool call — ask the model for a final answer
  // without tools so the user still gets a coherent reply.
  const closing = await provider.chat(messages, {
    system:
      opts.system +
      '\n\nYou have reached the maximum number of tool calls. Give your best final answer now using what you already know. Do not request more tools.',
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    signal: opts.signal,
  })
  usage.inputTokens += closing.usage.inputTokens
  usage.outputTokens += closing.usage.outputTokens
  return { text: closing.text, steps, usage, stepsTaken: opts.maxSteps, stoppedReason: 'max_steps' }
}

// ── One-shot helpers (no tools) ──────────────────────────────────────────────

export interface OneShotResult {
  text: string
  usage: AiUsage
}

async function oneShot(
  provider: AiProvider,
  system: string,
  user: string,
  opts: { temperature?: number | undefined; maxTokens?: number | undefined; signal?: AbortSignal | undefined } = {},
): Promise<OneShotResult> {
  const res = await provider.chat([{ role: 'user', content: user }], {
    system,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    signal: opts.signal,
  })
  return { text: res.text, usage: res.usage }
}

export function summarizeThread(
  provider: AiProvider,
  messages: string[],
  signal?: AbortSignal,
): Promise<OneShotResult> {
  return oneShot(
    provider,
    'You are a CRM assistant. Summarize email or conversation threads concisely for a sales rep. Focus on key decisions, action items, and relationship context. Keep it under 150 words.',
    `Summarize the following conversation thread:\n\n${messages.join('\n\n')}`,
    { temperature: 0.3, signal },
  )
}

export function draftReply(
  provider: AiProvider,
  thread: string,
  instructions: string,
  signal?: AbortSignal,
): Promise<OneShotResult> {
  return oneShot(
    provider,
    'You are a CRM assistant that drafts professional sales emails. Match the tone of the conversation. Be concise, clear, and action-oriented. Return only the email body.',
    `Conversation thread:\n${thread}\n\nInstructions: ${instructions}\n\nDraft a reply:`,
    { temperature: 0.6, signal },
  )
}

export function nextBestAction(
  provider: AiProvider,
  context: {
    contactName?: string | undefined
    dealTitle?: string | undefined
    dealStage?: string | undefined
    dealStatus?: string | undefined
    lastActivity?: string | undefined
    notes?: string | undefined
  },
  signal?: AbortSignal,
): Promise<OneShotResult> {
  const lines = [
    context.contactName ? `Contact: ${context.contactName}` : null,
    context.dealTitle ? `Deal: ${context.dealTitle}` : null,
    context.dealStage ? `Deal stage: ${context.dealStage}` : null,
    context.dealStatus ? `Deal status: ${context.dealStatus}` : null,
    context.lastActivity ? `Last activity: ${context.lastActivity}` : null,
    context.notes ? `Notes: ${context.notes}` : null,
  ].filter(Boolean)
  return oneShot(
    provider,
    'You are a CRM sales coach. Given the deal/contact context, recommend a single, specific next best action for the sales rep. Be direct and practical. Two sentences max.',
    `${lines.join('\n')}\n\nWhat is the single best next action the rep should take?`,
    { temperature: 0.5, signal },
  )
}

/**
 * Rank candidate items against a query and return the 0-based indices of the
 * most relevant, parsed from the model's JSON array. Falls back to an empty
 * list if the model returns something unparseable.
 */
export async function semanticSearch(
  provider: AiProvider,
  query: string,
  candidates: string[],
  signal?: AbortSignal,
): Promise<{ indices: number[]; usage: AiUsage }> {
  const res = await oneShot(
    provider,
    'You are a CRM assistant. Given a search query and a list of items, return the indices (0-based) of the most relevant items as a JSON array, e.g. [0, 2, 5]. Return only the JSON array, nothing else.',
    `Query: "${query}"\n\nCandidates:\n${candidates.map((c, i) => `${i}: ${c}`).join('\n')}\n\nReturn the indices of the most relevant results as a JSON array:`,
    { temperature: 0, signal },
  )
  const indices = parseIndexArray(res.text, candidates.length)
  return { indices, usage: res.usage }
}

/** Extract a JSON array of in-range integer indices from arbitrary model text.
 * The character class is permissive (digits, separators, signs, decimals) so a
 * model that returns floats/negatives still parses — the filter below is the
 * real guard, keeping only in-range non-negative integers. */
export function parseIndexArray(text: string, max: number): number[] {
  const match = text.match(/\[[\s\d.,+-]*\]/)
  if (!match) return []
  try {
    const arr = JSON.parse(match[0]) as unknown[]
    return arr
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < max)
  } catch {
    return []
  }
}
