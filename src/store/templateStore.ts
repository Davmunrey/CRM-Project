import { create } from 'zustand'
import type { EmailTemplate } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { devConsole } from '../lib/devConsole'
import { getOrgId, sbDelete } from '../lib/supabaseHelpers'
import { useAuthStore } from './authStore'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
  templates: [],
  /** Loaded from Supabase (or empty). */
  quickReplies: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ templates: [] })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await (supabase as any).from('email_templates').select('*').order('created_at', { ascending: false })
      if (error) throw error
      const templates: EmailTemplate[] = (data ?? []).map((r: any) => ({
        id: r.id, name: r.name, subject: r.subject, body: r.body,
        category: r.category, variables: r.variables ?? [],
        createdAt: r.created_at, updatedAt: r.updated_at, usageCount: r.usage_count ?? 0,
      }))
      set({ templates, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  fetchQuickReplies: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ quickReplies: [] })
      return
    }
    try {
      const { data, error } = await (supabase as any)
        .from('quick_replies')
        .select('id,title,body,created_at,updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      set({
        quickReplies: (data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      })
    } catch {
      // Leave current list unchanged; do not restore removed template rows.
    }
  },

  addTemplate: (template) => {
    const ts = new Date().toISOString()
    const newTemplate: EmailTemplate = { ...template, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts, usageCount: 0 }
    set((s) => ({ templates: [...s.templates, newTemplate] }))
    if (isSupabaseConfigured && supabase) {
      ;(supabase as any).from('email_templates').insert({
        id: newTemplate.id, name: newTemplate.name, subject: newTemplate.subject,
        body: newTemplate.body, category: newTemplate.category, variables: newTemplate.variables,
        usage_count: 0, organization_id: getOrgId(),
      }).then(({ error }: any) => { if (error) devConsole.error('[templateStore] insert error', error) })
    }
    return newTemplate
  },

  updateTemplate: (id, updates) => {
    set((s) => ({
      templates: s.templates.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
    }))
    if (isSupabaseConfigured && supabase) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) row.name = updates.name
      if (updates.subject !== undefined) row.subject = updates.subject
      if (updates.body !== undefined) row.body = updates.body
      if (updates.category !== undefined) row.category = updates.category
      if (updates.variables !== undefined) row.variables = updates.variables
      ;(supabase as any).from('email_templates').update(row).eq('id', id)
        .then(({ error }: any) => { if (error) devConsole.error('[templateStore] update error', error) })
    }
  },

  deleteTemplate: (id) => {
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
    if (isSupabaseConfigured && supabase) {
      sbDelete('email_templates', id).catch((e) => devConsole.error('[templateStore] delete error', e))
    }
  },

  addQuickReply: (input) => {
    const ts = new Date().toISOString()
    const item = { id: crypto.randomUUID(), title: input.title.trim(), body: input.body, createdAt: ts, updatedAt: ts }
    set((s) => ({ quickReplies: [item, ...s.quickReplies] }))
    if (isSupabaseConfigured && supabase) {
      const currentUserId = useAuthStore.getState().currentUser?.id
      if (!currentUserId) return
      void (supabase as any).from('quick_replies').insert({
        id: item.id,
        user_id: currentUserId,
        title: item.title,
        body: item.body,
        organization_id: getOrgId(),
      }).then(({ error }: { error: Error | null }) => {
        if (error) devConsole.error('[templateStore] quick_reply insert', error)
      })
    }
  },

  updateQuickReply: (id, updates) => {
    const updatedAt = new Date().toISOString()
    set((s) => ({
      quickReplies: s.quickReplies.map((reply) => (
        reply.id === id
          ? {
              ...reply,
              title: updates.title?.trim() ?? reply.title,
              body: updates.body ?? reply.body,
              updatedAt,
            }
          : reply
      )),
    }))
    if (isSupabaseConfigured && supabase && UUID_RE.test(id)) {
      const patch: Record<string, unknown> = { updated_at: updatedAt }
      if (updates.title !== undefined) patch.title = updates.title.trim()
      if (updates.body !== undefined) patch.body = updates.body
      void (supabase as any).from('quick_replies').update(patch).eq('id', id)
        .then(({ error }: { error: Error | null }) => {
          if (error) devConsole.error('[templateStore] quick_reply update', error)
        })
    }
  },

  deleteQuickReply: (id) => {
    set((s) => ({ quickReplies: s.quickReplies.filter((reply) => reply.id !== id) }))
    if (isSupabaseConfigured && supabase && UUID_RE.test(id)) {
      void (supabase as any).from('quick_replies').delete().eq('id', id)
        .then(({ error }: { error: Error | null }) => {
          if (error) devConsole.error('[templateStore] quick_reply delete', error)
        })
    }
  },

  incrementUsage: (id) => {
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, usageCount: t.usageCount + 1, updatedAt: new Date().toISOString() } : t
      ),
    }))
    if (isSupabaseConfigured && supabase) {
      const t = get().templates.find((x) => x.id === id)
      if (t) {
        ;(supabase as any).from('email_templates').update({ usage_count: t.usageCount }).eq('id', id)
          .then(({ error }: any) => { if (error) devConsole.error('[templateStore] usage error', error) })
      }
    }
  },

  getByCategory: (category) => get().templates.filter((t) => t.category === category),
}))
