import { create } from 'zustand'
import type { EmailTemplate } from '../types'
import { api } from '../lib/api'

interface TemplateStore {
  templates: EmailTemplate[]
  quickReplies: Array<{ id: string; title: string; body: string; createdAt: string; updatedAt: string }>
  isLoading: boolean
  error: string | null
  fetchTemplates: () => Promise<void>
  fetchQuickReplies: () => Promise<void>
  addTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => EmailTemplate
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void
  deleteTemplate: (id: string) => void
  addQuickReply: (input: { title: string; body: string }) => void
  updateQuickReply: (id: string, updates: { title?: string; body?: string }) => void
  deleteQuickReply: (id: string) => void
  incrementUsage: (id: string) => void
  getByCategory: (category: EmailTemplate['category']) => EmailTemplate[]
}

type ApiTemplate = Record<string, unknown>
type ApiQR = Record<string, unknown>

function rowToTemplate(r: ApiTemplate): EmailTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    subject: r.subject as string,
    body: r.body as string,
    category: (r.category as EmailTemplate['category']) ?? 'general',
    variables: (r.variables as string[]) ?? [],
    createdAt: ((r.createdAt ?? r.created_at) as string),
    updatedAt: ((r.updatedAt ?? r.updated_at) as string),
    usageCount: ((r.usageCount ?? r.usage_count) as number) ?? 0,
  }
}

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
  templates: [],
  quickReplies: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiTemplate[]>('/templates')
      set({ templates: (data ?? []).map(rowToTemplate), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  fetchQuickReplies: async () => {
    try {
      const data = await api.get<ApiQR[]>('/templates/quick-replies')
      set({
        quickReplies: (data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          body: row.body as string,
          createdAt: ((row.createdAt ?? row.created_at) as string),
          updatedAt: ((row.updatedAt ?? row.updated_at) as string),
        })),
      })
    } catch {
      // leave unchanged
    }
  },

  addTemplate: (template) => {
    const ts = new Date().toISOString()
    const optimistic: EmailTemplate = { ...template, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts, usageCount: 0 }
    set((s) => ({ templates: [...s.templates, optimistic] }))
    api.post<ApiTemplate>('/templates', {
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables,
    }).then((created) => {
      set((s) => ({ templates: s.templates.map((t) => t.id === optimistic.id ? rowToTemplate(created) : t) }))
    }).catch(() => {})
    return optimistic
  },

  updateTemplate: (id, updates) => {
    set((s) => ({
      templates: s.templates.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
    }))
    api.patch(`/templates/${id}`, updates).catch(() => {})
  },

  deleteTemplate: (id) => {
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
    api.delete(`/templates/${id}`).catch(() => {})
  },

  addQuickReply: (input) => {
    const ts = new Date().toISOString()
    const item = { id: crypto.randomUUID(), title: input.title.trim(), body: input.body, createdAt: ts, updatedAt: ts }
    set((s) => ({ quickReplies: [item, ...s.quickReplies] }))
    api.post<ApiQR>('/templates/quick-replies', { title: input.title.trim(), body: input.body }).then((created) => {
      set((s) => ({
        quickReplies: s.quickReplies.map((r) => r.id === item.id ? {
          id: created.id as string,
          title: created.title as string,
          body: created.body as string,
          createdAt: (created.createdAt ?? created.created_at) as string,
          updatedAt: (created.updatedAt ?? created.updated_at) as string,
        } : r),
      }))
    }).catch(() => {})
  },

  updateQuickReply: (id, updates) => {
    const updatedAt = new Date().toISOString()
    set((s) => ({
      quickReplies: s.quickReplies.map((reply) =>
        reply.id === id
          ? { ...reply, title: updates.title?.trim() ?? reply.title, body: updates.body ?? reply.body, updatedAt }
          : reply
      ),
    }))
    api.patch(`/templates/quick-replies/${id}`, updates).catch(() => {})
  },

  deleteQuickReply: (id) => {
    set((s) => ({ quickReplies: s.quickReplies.filter((reply) => reply.id !== id) }))
    api.delete(`/templates/quick-replies/${id}`).catch(() => {})
  },

  incrementUsage: (id) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, usageCount: t.usageCount + 1, updatedAt: new Date().toISOString() } : t
      ),
    }))
    api.post(`/templates/${id}/increment-usage`, {}).catch(() => {})
  },

  getByCategory: (category) => get().templates.filter((t) => t.category === category),
}))
