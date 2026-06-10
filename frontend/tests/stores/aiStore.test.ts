import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>()
  return {
    ...actual,
    api: { ...actual.api, get: mockGet, post: mockPost },
  }
})

// Silence toast side-effects.
vi.mock('../../src/store/toastStore', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

async function freshStore() {
  vi.resetModules()
  const mod = await import('../../src/store/aiStore')
  return mod.useAiStore
}

describe('aiStore', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('fetchStatus stores the provider status', async () => {
    const useAiStore = await freshStore()
    mockGet.mockResolvedValueOnce({
      enabled: true,
      providers: ['gemini'],
      defaultProvider: 'gemini',
      activeProvider: 'gemini',
      model: 'gemini-2.0-flash',
      maxSteps: 8,
    })
    await useAiStore.getState().fetchStatus()
    const s = useAiStore.getState()
    expect(s.statusChecked).toBe(true)
    expect(s.status?.enabled).toBe(true)
    expect(s.status?.activeProvider).toBe('gemini')
    expect(mockGet).toHaveBeenCalledWith('/ai/status')
  })

  it('fetchStatus marks AI disabled when the endpoint fails', async () => {
    const useAiStore = await freshStore()
    mockGet.mockRejectedValueOnce(new Error('503'))
    await useAiStore.getState().fetchStatus()
    expect(useAiStore.getState().status?.enabled).toBe(false)
  })

  it('sendMessage appends the user turn and replaces the pending assistant turn with the reply', async () => {
    const useAiStore = await freshStore()
    mockPost.mockResolvedValueOnce({
      conversationId: 'conv-1',
      reply: 'Here is what I found.',
      steps: [{ tool: 'search_contacts', args: { query: 'acme' }, result: { count: 1 } }],
      stoppedReason: 'final',
      provider: 'gemini',
    })
    await useAiStore.getState().sendMessage('who is at acme?')
    const s = useAiStore.getState()
    expect(s.conversationId).toBe('conv-1')
    expect(s.messages).toHaveLength(2)
    expect(s.messages[0]).toMatchObject({ role: 'user', content: 'who is at acme?' })
    expect(s.messages[1]).toMatchObject({ role: 'assistant', content: 'Here is what I found.' })
    expect(s.messages[1]!.steps).toHaveLength(1)
    expect(mockPost).toHaveBeenCalledWith('/ai/agent', {
      message: 'who is at acme?',
      conversationId: undefined,
      allowWrites: false,
    })
  })

  it('sendMessage passes conversationId and allowWrites on subsequent turns', async () => {
    const useAiStore = await freshStore()
    useAiStore.setState({ conversationId: 'conv-9', allowWrites: true })
    mockPost.mockResolvedValueOnce({ conversationId: 'conv-9', reply: 'ok', steps: [], stoppedReason: 'final', provider: 'gemini' })
    await useAiStore.getState().sendMessage('log a call')
    expect(mockPost).toHaveBeenCalledWith('/ai/agent', {
      message: 'log a call',
      conversationId: 'conv-9',
      allowWrites: true,
    })
  })

  it('sendMessage removes the pending bubble and records an error on failure', async () => {
    const useAiStore = await freshStore()
    mockPost.mockRejectedValueOnce(new Error('AI request failed: boom'))
    await useAiStore.getState().sendMessage('hello')
    const s = useAiStore.getState()
    // Only the user message remains; the pending assistant bubble was removed.
    expect(s.messages).toHaveLength(1)
    expect(s.messages[0]!.role).toBe('user')
    expect(s.error).toContain('boom')
    expect(s.isSending).toBe(false)
  })

  it('one-shot helpers hit the right endpoints and return text', async () => {
    const useAiStore = await freshStore()
    mockPost.mockResolvedValue({ text: 'result', provider: 'gemini' })

    await expect(useAiStore.getState().summarizeThread(['a', 'b'])).resolves.toBe('result')
    expect(mockPost).toHaveBeenLastCalledWith('/ai/summarize', { messages: ['a', 'b'] })

    await expect(useAiStore.getState().draftReply('thread', 'be brief')).resolves.toBe('result')
    expect(mockPost).toHaveBeenLastCalledWith('/ai/draft-reply', { thread: 'thread', instructions: 'be brief' })

    await expect(useAiStore.getState().nextBestAction({ dealId: 'd1' })).resolves.toBe('result')
    expect(mockPost).toHaveBeenLastCalledWith('/ai/next-best-action', { dealId: 'd1' })
  })

  it('clearConversation resets the thread', async () => {
    const useAiStore = await freshStore()
    useAiStore.setState({ messages: [{ id: '1', role: 'user', content: 'x' }], conversationId: 'c', error: 'e' })
    useAiStore.getState().clearConversation()
    const s = useAiStore.getState()
    expect(s.messages).toHaveLength(0)
    expect(s.conversationId).toBeNull()
    expect(s.error).toBeNull()
  })
})
