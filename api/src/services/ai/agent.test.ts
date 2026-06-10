import { describe, expect, it, vi } from 'vitest'
import {
  parseIndexArray,
  runAgent,
  semanticSearch,
  summarizeThread,
} from './agent.js'
import type { AiChatResult, AiMessage, AiProvider } from './providers.js'

/** A provider that returns a scripted sequence of results, recording inputs. */
function scriptedProvider(results: Array<Partial<AiChatResult>>): AiProvider & {
  calls: Array<{ messages: AiMessage[]; system?: string | undefined }>
} {
  let i = 0
  const calls: Array<{ messages: AiMessage[]; system?: string | undefined }> = []
  return {
    id: 'gemini',
    model: 'test',
    calls,
    async chat(messages, opts) {
      calls.push({ messages: structuredClone(messages), system: opts?.system })
      const r = results[Math.min(i, results.length - 1)]!
      i++
      return {
        text: r.text ?? '',
        toolCalls: r.toolCalls ?? [],
        usage: r.usage ?? { inputTokens: 1, outputTokens: 1 },
        finishReason: r.finishReason ?? 'stop',
      }
    },
  }
}

describe('runAgent', () => {
  it('executes a requested tool then returns the final answer', async () => {
    const provider = scriptedProvider([
      { toolCalls: [{ id: 't1', name: 'search_contacts', args: { query: 'acme' } }], usage: { inputTokens: 10, outputTokens: 2 } },
      { text: 'Found 1 contact at Acme.', usage: { inputTokens: 8, outputTokens: 5 } },
    ])
    const execute = vi.fn(async () => ({ count: 1, contacts: [{ id: 'c1' }] }))

    const result = await runAgent(provider, {
      system: 'sys',
      messages: [{ role: 'user', content: 'who works at acme?' }],
      tools: [{ name: 'search_contacts', description: 'd', parameters: { type: 'object' } }],
      execute,
      maxSteps: 5,
    })

    expect(execute).toHaveBeenCalledTimes(1)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0]!.tool).toBe('search_contacts')
    expect(result.text).toBe('Found 1 contact at Acme.')
    expect(result.stoppedReason).toBe('final')
    expect(result.usage).toEqual({ inputTokens: 18, outputTokens: 7 })
    // The second provider call must include the assistant tool-call turn + the tool result.
    const secondCall = provider.calls[1]!
    expect(secondCall.messages.some((m) => m.role === 'tool')).toBe(true)
    expect(secondCall.messages.some((m) => m.role === 'assistant' && (m.toolCalls?.length ?? 0) > 0)).toBe(true)
  })

  it('stops at maxSteps and asks for a final answer without tools', async () => {
    // Always requests a tool — should hit the ceiling.
    const provider = scriptedProvider([
      { toolCalls: [{ id: 't', name: 'search_deals', args: {} }] },
    ])
    // Override last result so the closing (no-tools) call returns text.
    const realChat = provider.chat.bind(provider)
    let callCount = 0
    provider.chat = async (messages, opts) => {
      callCount++
      if (callCount > 3) return { text: 'Best effort answer.', toolCalls: [], usage: { inputTokens: 1, outputTokens: 1 }, finishReason: 'stop' }
      return realChat(messages, opts)
    }

    const execute = vi.fn(async () => ({ ok: true }))
    const result = await runAgent(provider, {
      system: 'sys',
      messages: [{ role: 'user', content: 'x' }],
      tools: [{ name: 'search_deals', description: 'd', parameters: { type: 'object' } }],
      execute,
      maxSteps: 3,
    })

    expect(result.stoppedReason).toBe('max_steps')
    expect(result.stepsTaken).toBe(3)
    expect(result.text).toBe('Best effort answer.')
    expect(execute).toHaveBeenCalledTimes(3)
  })

  it('captures tool execution errors and keeps going', async () => {
    const provider = scriptedProvider([
      { toolCalls: [{ id: 't1', name: 'boom', args: {} }] },
      { text: 'Recovered.' },
    ])
    const execute = vi.fn(async () => {
      throw new Error('tool exploded')
    })
    const result = await runAgent(provider, {
      system: 'sys',
      messages: [{ role: 'user', content: 'x' }],
      tools: [{ name: 'boom', description: 'd', parameters: { type: 'object' } }],
      execute,
      maxSteps: 4,
    })
    expect(result.steps[0]!.result).toEqual({ error: 'tool exploded' })
    expect(result.text).toBe('Recovered.')
  })
})

describe('one-shot helpers', () => {
  it('summarizeThread sends the joined thread and returns text', async () => {
    const provider = scriptedProvider([{ text: 'A concise summary.' }])
    const res = await summarizeThread(provider, ['msg one', 'msg two'])
    expect(res.text).toBe('A concise summary.')
    const userMsg = provider.calls[0]!.messages.find((m) => m.role === 'user')!
    expect(userMsg.content).toContain('msg one')
    expect(userMsg.content).toContain('msg two')
    expect(provider.calls[0]!.system).toContain('Summarize')
  })

  it('semanticSearch parses the index array and filters out-of-range values', async () => {
    const provider = scriptedProvider([{ text: '[0, 2, 99]' }])
    const res = await semanticSearch(provider, 'q', ['a', 'b', 'c'])
    expect(res.indices).toEqual([0, 2])
  })
})

describe('parseIndexArray', () => {
  it('extracts a JSON array embedded in prose', () => {
    expect(parseIndexArray('The best matches are [1, 3, 0].', 5)).toEqual([1, 3, 0])
  })
  it('drops non-integer and out-of-range entries', () => {
    expect(parseIndexArray('[0, 1.5, 7, -1, 2]', 3)).toEqual([0, 2])
  })
  it('returns empty when no array present', () => {
    expect(parseIndexArray('no indices here', 5)).toEqual([])
  })
})
