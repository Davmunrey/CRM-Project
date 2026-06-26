import { create } from 'zustand'
import type { AuditAction, AuditEntry } from '../types'
import { useAuthStore } from './authStore'
import { api } from '../lib/api'

const MAX_ENTRIES = 500

interface AuditStore {
  entries: AuditEntry[]
  isLoading: boolean
  error: string | null
  fetchEntries: () => Promise<void>
  logAction: (
    action: AuditAction,
    entityType: AuditEntry['entityType'],
    entityId: string,
    entityName: string,
    details: string
  ) => void
  getByEntity: (entityType: AuditEntry['entityType'], entityId: string) => AuditEntry[]
  getRecent: (limit: number) => AuditEntry[]
  clear: () => void
}

type ApiEntry = Record<string, unknown>

export const useAuditStore = create<AuditStore>()((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiEntry[]>('/audit')
      const entries: AuditEntry[] = (data ?? []).map((r) => ({
        id: r.id as string,
        action: (r.action ?? r.action) as AuditAction,
        entityType: ((r.entityType ?? r.entity_type) as AuditEntry['entityType']),
        entityId: ((r.entityId ?? r.entity_id) as string),
        entityName: ((r.entityName ?? r.entity_name) as string),
        details: (r.details as string) ?? '',
        userId: ((r.userId ?? r.user_id) as string),
        timestamp: ((r.createdAt ?? r.created_at) as string),
      }))
      set({ entries, isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  logAction: (action, entityType, entityId, entityName, details) => {
    const entry: AuditEntry = {
      id: crypto.randomUUID(), action, entityType, entityId, entityName, details,
      userId: useAuthStore.getState().currentUser?.name || 'system',
      timestamp: new Date().toISOString(),
    }
    set((s) => ({ entries: [entry, ...s.entries].slice(0, MAX_ENTRIES) }))
    api.post('/audit', { action, entityType, entityId, entityName, details }).catch(() => {})
  },

  getByEntity: (entityType, entityId) =>
    get().entries.filter((e) => e.entityType === entityType && e.entityId === entityId),

  getRecent: (limit) => get().entries.slice(0, limit),

  clear: () => { set({ entries: [] }) },
}))
