/**
 * Multi-provider AI abstraction for n0CRM.
 *
 * One normalized message/tool format (see `AiMessage` / `AiToolDef`) is
 * translated to each vendor's wire format. Google Gemini is the free default;
 * OpenAI and Anthropic are drop-in alternatives. Providers are only usable when
 * their API key is configured — see `availableProviders()` / `resolveProvider()`.
 *
 * Outbound calls go ONLY to a fixed allow-list of vendor hosts (no user-supplied
 * URLs ever reach `fetch` here), which is why a constant allow-list check is
 * sufficient and the `ssrfGuard` IP-pinning dance used for webhooks is not.
 */
import { env } from '../../config/env.js'

// ── Normalized types ────────────────────────────────────────────────────────

export type AiProviderId = 'gemini' | 'openai' | 'anthropic'
export type AiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AiToolCall {
  /** Stable id correlating an assistant tool request to its tool result. */
  id: string
  name: string
  args: Record<string, unknown>
}

export interface AiMessage {
  role: AiRole
  /** Free text. Empty string when an assistant turn is purely tool calls. */
  content: string
  /** Present on assistant turns that request tool execution. */
  toolCalls?: AiToolCall[]
  /** For role:'tool' — the id of the assistant tool call this answers. */
  toolCallId?: string
  /** For role:'tool' — the tool name (Gemini keys results by name). */
  name?: string
}

export interface AiToolDef {
  name: string
  description: string
  /** JSON Schema object describing the tool's arguments. */
  parameters: Record<string, unknown>
}

export interface AiChatOptions {
  // `| undefined` is required because the project uses exactOptionalPropertyTypes;
  // callers thread through values that may be undefined.
  system?: string | undefined
  tools?: AiToolDef[] | undefined
  maxTokens?: number | undefined
  temperature?: number | undefined
  signal?: AbortSignal | undefined
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

export interface AiChatResult {
  text: string
  toolCalls: AiToolCall[]
  usage: AiUsage
  finishReason: string
}

export interface AiProvider {
  readonly id: AiProviderId
  readonly model: string
  chat(messages: AiMessage[], opts?: AiChatOptions): Promise<AiChatResult>
}

export class AiError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 502) {
    super(message)
    this.name = 'AiError'
    this.statusCode = statusCode
  }
}

// ── Defaults & host allow-list ───────────────────────────────────────────────

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-6',
}

const ALLOWED_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.anthropic.com',
])

const DEFAULT_MAX_TOKENS = 1024
const DEFAULT_TEMPERATURE = 0.4
const REQUEST_TIMEOUT_MS = 30_000

/** Defense-in-depth: refuse to call any host that isn't a known vendor. */
function assertAllowedHost(url: string): void {
  const host = new URL(url).hostname
  if (!ALLOWED_HOSTS.has(host)) {
    throw new AiError(`Refusing to call non-allowlisted AI host: ${host}`, 500)
  }
}

/** fetch with a hard timeout + allow-list check. Caller-supplied signal is honored. */
async function vendorFetch(
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  assertAllowedHost(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new AiError(`AI provider request failed: ${msg}`, 502)
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args?: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}
interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const
  readonly model: string
  private apiKey: string

  constructor(apiKey: string, model = env.AI_GEMINI_MODEL ?? DEFAULT_MODELS.gemini) {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(messages: AiMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
    const systemFromMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const system = [opts.system, systemFromMessages].filter(Boolean).join('\n\n')

    const contents: GeminiContent[] = []
    for (const m of messages) {
      if (m.role === 'system') continue
      if (m.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: m.content }] })
      } else if (m.role === 'assistant') {
        const parts: GeminiPart[] = []
        if (m.content) parts.push({ text: m.content })
        for (const tc of m.toolCalls ?? []) {
          parts.push({ functionCall: { name: tc.name, args: tc.args } })
        }
        if (parts.length) contents.push({ role: 'model', parts })
      } else if (m.role === 'tool') {
        // Gemini carries function results as a user-role functionResponse part.
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(m.content) as Record<string, unknown>
        } catch {
          parsed = { result: m.content }
        }
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: m.name ?? 'tool', response: parsed } }],
        })
      }
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      },
    }
    if (system) body['systemInstruction'] = { parts: [{ text: system }] }
    if (opts.tools?.length) {
      body['tools'] = [
        {
          functionDeclarations: opts.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ]
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
    const res = await vendorFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(body),
      },
      opts.signal,
    )
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new AiError(`Gemini API error ${res.status}: ${txt}`, res.status >= 500 ? 502 : 400)
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: GeminiPart[] }
        finishReason?: string
      }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }
    const candidate = data.candidates?.[0]
    const parts = candidate?.content?.parts ?? []
    let text = ''
    const toolCalls: AiToolCall[] = []
    for (const [i, part] of parts.entries()) {
      if (part.text) text += part.text
      if (part.functionCall) {
        toolCalls.push({
          id: `${part.functionCall.name}_${i}`,
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
        })
      }
    }
    return {
      text,
      toolCalls,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      finishReason: candidate?.finishReason ?? (toolCalls.length ? 'tool_calls' : 'stop'),
    }
  }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

export class OpenAIProvider implements AiProvider {
  readonly id = 'openai' as const
  readonly model: string
  private apiKey: string

  constructor(apiKey: string, model = env.AI_OPENAI_MODEL ?? DEFAULT_MODELS.openai) {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(messages: AiMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
    const wire: OpenAIMessage[] = []
    if (opts.system) wire.push({ role: 'system', content: opts.system })
    for (const m of messages) {
      if (m.role === 'system') {
        wire.push({ role: 'system', content: m.content })
      } else if (m.role === 'assistant') {
        const msg: OpenAIMessage = { role: 'assistant', content: m.content || null }
        if (m.toolCalls?.length) {
          msg.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          }))
        }
        wire.push(msg)
      } else if (m.role === 'tool') {
        wire.push({ role: 'tool', tool_call_id: m.toolCallId ?? '', content: m.content })
      } else {
        wire.push({ role: 'user', content: m.content })
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: wire,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    }
    if (opts.tools?.length) {
      body['tools'] = opts.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    const res = await vendorFetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      opts.signal,
    )
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new AiError(`OpenAI API error ${res.status}: ${txt}`, res.status >= 500 ? 502 : 400)
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: OpenAIToolCall[] }
        finish_reason?: string
      }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const choice = data.choices?.[0]
    const toolCalls: AiToolCall[] = (choice?.message?.tool_calls ?? []).map((tc) => {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }
      return { id: tc.id, name: tc.function.name, args }
    })
    return {
      text: choice?.message?.content ?? '',
      toolCalls,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
      finishReason: choice?.finish_reason ?? 'stop',
    }
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: AnthropicBlock[]
}

export class AnthropicProvider implements AiProvider {
  readonly id = 'anthropic' as const
  readonly model: string
  private apiKey: string

  constructor(apiKey: string, model = env.AI_ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic) {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(messages: AiMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
    const systemFromMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const system = [opts.system, systemFromMessages].filter(Boolean).join('\n\n')

    const wire: AnthropicMessage[] = []
    for (const m of messages) {
      if (m.role === 'system') continue
      if (m.role === 'assistant') {
        const blocks: AnthropicBlock[] = []
        if (m.content) blocks.push({ type: 'text', text: m.content })
        for (const tc of m.toolCalls ?? []) {
          blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args })
        }
        wire.push({ role: 'assistant', content: blocks })
      } else if (m.role === 'tool') {
        wire.push({
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: m.toolCallId ?? '', content: m.content },
          ],
        })
      } else {
        wire.push({ role: 'user', content: [{ type: 'text', text: m.content }] })
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
      messages: wire,
    }
    if (system) body['system'] = system
    if (opts.tools?.length) {
      body['tools'] = opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    }

    const res = await vendorFetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      },
      opts.signal,
    )
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new AiError(`Anthropic API error ${res.status}: ${txt}`, res.status >= 500 ? 502 : 400)
    }

    const data = (await res.json()) as {
      content?: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      >
      stop_reason?: string
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    let text = ''
    const toolCalls: AiToolCall[] = []
    for (const block of data.content ?? []) {
      if (block.type === 'text') text += block.text
      else if (block.type === 'tool_use') {
        toolCalls.push({ id: block.id, name: block.name, args: block.input ?? {} })
      }
    }
    return {
      text,
      toolCalls,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
      finishReason: data.stop_reason ?? 'stop',
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

function keyFor(id: AiProviderId): string | undefined {
  if (id === 'gemini') return env.GEMINI_API_KEY
  if (id === 'openai') return env.OPENAI_API_KEY
  return env.ANTHROPIC_API_KEY
}

/** Provider ids that have a configured API key, in preference order. */
export function availableProviders(): AiProviderId[] {
  const order: AiProviderId[] = ['gemini', 'openai', 'anthropic']
  // Put the configured default first so it wins when present.
  order.sort((a, b) => (a === env.AI_DEFAULT_PROVIDER ? -1 : b === env.AI_DEFAULT_PROVIDER ? 1 : 0))
  return order.filter((id) => Boolean(keyFor(id)))
}

export function isAiConfigured(): boolean {
  return availableProviders().length > 0
}

function makeProvider(id: AiProviderId, apiKey: string): AiProvider {
  if (id === 'gemini') return new GeminiProvider(apiKey)
  if (id === 'openai') return new OpenAIProvider(apiKey)
  return new AnthropicProvider(apiKey)
}

/**
 * Resolve a usable provider. Preference:
 *   1. `preferred` (e.g. from org settings) when its key is configured,
 *   2. the env default provider when configured,
 *   3. any other configured provider.
 * Returns null when no provider has a key.
 */
export function resolveProvider(preferred?: string | null): AiProvider | null {
  const configured = availableProviders()
  if (configured.length === 0) return null

  const pref = preferred as AiProviderId | undefined
  if (pref && configured.includes(pref)) {
    return makeProvider(pref, keyFor(pref)!)
  }
  const chosen = configured[0]!
  return makeProvider(chosen, keyFor(chosen)!)
}
