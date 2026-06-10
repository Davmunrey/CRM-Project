import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAIProvider,
  availableProviders,
  isAiConfigured,
  resolveProvider,
} from './providers.js'

function mockFetchOnce(jsonBody: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn(async () =>
    ({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => jsonBody,
      text: async () => JSON.stringify(jsonBody),
    }) as unknown as Response,
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GeminiProvider', () => {
  it('builds a v1beta generateContent request and parses text + tool calls', async () => {
    const fetchMock = mockFetchOnce({
      candidates: [
        {
          content: {
            parts: [
              { text: 'Here you go.' },
              { functionCall: { name: 'search_contacts', args: { query: 'acme' } } },
            ],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 7 },
    })

    const provider = new GeminiProvider('secret-key', 'gemini-2.0-flash')
    const res = await provider.chat([{ role: 'user', content: 'find acme' }], {
      system: 'You are a CRM assistant.',
      tools: [{ name: 'search_contacts', description: 'find', parameters: { type: 'object' } }],
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toContain('generativelanguage.googleapis.com')
    expect(String(url)).toContain('gemini-2.0-flash:generateContent')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('secret-key')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.systemInstruction.parts[0].text).toContain('CRM assistant')
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'find acme' }] })
    expect(body.tools[0].functionDeclarations[0].name).toBe('search_contacts')

    expect(res.text).toBe('Here you go.')
    expect(res.toolCalls).toHaveLength(1)
    expect(res.toolCalls[0]!.name).toBe('search_contacts')
    expect(res.toolCalls[0]!.args).toEqual({ query: 'acme' })
    expect(res.usage).toEqual({ inputTokens: 12, outputTokens: 7 })
  })

  it('maps assistant tool calls and tool results back into Gemini contents', async () => {
    const fetchMock = mockFetchOnce({
      candidates: [{ content: { parts: [{ text: 'done' }] }, finishReason: 'STOP' }],
    })
    const provider = new GeminiProvider('k')
    await provider.chat([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'get_deal', args: { id: 'd1' } }] },
      { role: 'tool', name: 'get_deal', toolCallId: 'c1', content: JSON.stringify({ deal: { id: 'd1' } }) },
    ])
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.contents[1]).toEqual({ role: 'model', parts: [{ functionCall: { name: 'get_deal', args: { id: 'd1' } } }] })
    expect(body.contents[2].role).toBe('user')
    expect(body.contents[2].parts[0].functionResponse.name).toBe('get_deal')
  })

  it('throws AiError on non-ok responses', async () => {
    mockFetchOnce({ error: 'bad' }, false, 400)
    const provider = new GeminiProvider('k')
    await expect(provider.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/Gemini API error 400/)
  })
})

describe('OpenAIProvider', () => {
  it('builds a chat/completions request and parses tool_calls', async () => {
    const fetchMock = mockFetchOnce({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              { id: 'tc1', type: 'function', function: { name: 'get_deal', arguments: '{"id":"d1"}' } },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 3 },
    })
    const provider = new OpenAIProvider('sk-test', 'gpt-4o-mini')
    const res = await provider.chat([{ role: 'user', content: 'get deal' }], {
      tools: [{ name: 'get_deal', description: 'd', parameters: { type: 'object' } }],
    })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions')
    expect(((init as RequestInit).headers as Record<string, string>)['Authorization']).toBe('Bearer sk-test')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.tools[0].type).toBe('function')
    expect(res.toolCalls[0]!.args).toEqual({ id: 'd1' })
    expect(res.usage).toEqual({ inputTokens: 5, outputTokens: 3 })
  })
})

describe('AnthropicProvider', () => {
  it('builds a messages request with system + tools and parses tool_use blocks', async () => {
    const fetchMock = mockFetchOnce({
      content: [
        { type: 'text', text: 'Looking...' },
        { type: 'tool_use', id: 'tu1', name: 'search_deals', input: { status: 'open' } },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 9, output_tokens: 4 },
    })
    const provider = new AnthropicProvider('ak', 'claude-sonnet-4-6')
    const res = await provider.chat([{ role: 'user', content: 'open deals' }], {
      system: 'sys',
      tools: [{ name: 'search_deals', description: 'd', parameters: { type: 'object' } }],
    })
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('ak')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(init.body as string)
    expect(body.system).toBe('sys')
    expect(body.tools[0].input_schema).toEqual({ type: 'object' })
    expect(res.text).toBe('Looking...')
    expect(res.toolCalls[0]!.name).toBe('search_deals')
    expect(res.usage).toEqual({ inputTokens: 9, outputTokens: 4 })
  })
})

describe('provider resolution', () => {
  it('reports configured providers (GEMINI_API_KEY set in setup)', () => {
    expect(isAiConfigured()).toBe(true)
    expect(availableProviders()).toContain('gemini')
  })

  it('falls back to a configured provider when the preferred one has no key', () => {
    // openai has no key in tests, so resolveProvider should fall back to gemini.
    const provider = resolveProvider('openai')
    expect(provider).not.toBeNull()
    expect(provider!.id).toBe('gemini')
  })

  it('returns the preferred provider when configured', () => {
    expect(resolveProvider('gemini')!.id).toBe('gemini')
  })
})
