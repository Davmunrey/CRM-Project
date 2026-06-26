import { create } from 'zustand'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'
import { toast } from './toastStore'

export interface AiStatus {
  enabled: boolean
  providers: string[]
  defaultProvider: string
  activeProvider: string | null
  model: string | null
  maxSteps: number
}

export interface AgentStep {
  tool: string
  args: Record<string, unknown>
  result: unknown
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: AgentStep[]
  pending?: boolean
}

interface AgentResponse {
  conversationId: string
  reply: string
  steps: AgentStep[]
  stoppedReason: 'final' | 'max_steps'
  provider: string
}

export interface AiState {
  status: AiStatus | null
  statusChecked: boolean

  // Assistant chat drawer
  isOpen: boolean
  allowWrites: boolean
  messages: AiChatMessage[]
  conversationId: string | null
  isSending: boolean
  error: string | null

  fetchStatus: () => Promise<void>
  openAssistant: () => void
  closeAssistant: () => void
  setAllowWrites: (value: boolean) => void
  clearConversation: () => void
  sendMessage: (text: string) => Promise<void>

  // One-shot helpers used by Inbox / detail pages. Resolve to the AI text,
  // or throw with a user-readable message the caller surfaces locally.
  summarizeThread: (messages: string[]) => Promise<string>
  draftReply: (thread: string, instructions?: string) => Promise<string>
  nextBestAction: (params: { contactId?: string; dealId?: string }) => Promise<string>
}

// Dedupe concurrent /ai/status probes (multiple components may mount at once).
let statusInFlight: Promise<void> | null = null

export const useAiStore = create<AiState>()((set, get) => ({
  status: null,
  statusChecked: false,
  isOpen: false,
  allowWrites: false,
  messages: [],
  conversationId: null,
  isSending: false,
  error: null,

  fetchStatus: async () => {
    if (statusInFlight) return statusInFlight
    statusInFlight = (async () => {
      try {
        const status = await api.get<AiStatus>('/ai/status')
        set({ status, statusChecked: true })
      } catch {
        // Treat any failure as "AI unavailable" — the UI simply hides AI actions.
        set({ status: { enabled: false, providers: [], defaultProvider: 'gemini', activeProvider: null, model: null, maxSteps: 0 }, statusChecked: true })
      }
    })()
    try {
      await statusInFlight
    } finally {
      statusInFlight = null
    }
  },

  openAssistant: () => {
    set({ isOpen: true })
    if (!get().statusChecked) void get().fetchStatus()
  },
  closeAssistant: () => set({ isOpen: false }),
  setAllowWrites: (value) => set({ allowWrites: value }),
  clearConversation: () => set({ messages: [], conversationId: null, error: null }),

  sendMessage: async (text) => {
    const trimmed = text.trim()
    if (!trimmed || get().isSending) return
    const userMsg: AiChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const pendingId = crypto.randomUUID()
    set((s) => ({
      messages: [...s.messages, userMsg, { id: pendingId, role: 'assistant', content: '', pending: true }],
      isSending: true,
      error: null,
    }))
    try {
      const res = await api.post<AgentResponse>('/ai/agent', {
        message: trimmed,
        conversationId: get().conversationId ?? undefined,
        allowWrites: get().allowWrites,
      })
      set((s) => ({
        conversationId: res.conversationId,
        isSending: false,
        messages: s.messages.map((m) =>
          m.id === pendingId ? { id: pendingId, role: 'assistant', content: res.reply, steps: res.steps } : m,
        ),
      }))
    } catch (e: unknown) {
      const message = getErrorMessage(e)
      set((s) => ({
        isSending: false,
        error: message,
        messages: s.messages.filter((m) => m.id !== pendingId),
      }))
      toast.error(message)
    }
  },

  summarizeThread: async (messages) => {
    const res = await api.post<{ text: string }>('/ai/summarize', { messages })
    return res.text
  },

  draftReply: async (thread, instructions) => {
    const res = await api.post<{ text: string }>('/ai/draft-reply', {
      thread,
      ...(instructions ? { instructions } : {}),
    })
    return res.text
  },

  nextBestAction: async (params) => {
    const res = await api.post<{ text: string }>('/ai/next-best-action', params)
    return res.text
  },
}))
