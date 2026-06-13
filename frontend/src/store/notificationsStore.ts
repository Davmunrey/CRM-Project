import { create } from 'zustand'
import type { CRMNotification, NotificationType } from '../types'
import { useAuthStore } from './authStore'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'

const MAX_NOTIFICATIONS = 200

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'deal_won', 'deal_lost', 'deal_stage_changed',
  'activity_overdue', 'activity_assigned',
  'follow_up_due', 'contact_assigned',
  'goal_achieved', 'goal_at_risk',
  'mention', 'system',
]

function mapNotification(row: Record<string, unknown>): CRMNotification {
  return {
    id: row.id as string,
    type: (row.type as NotificationType) ?? 'system',
    title: (row.title as string) ?? '',
    message: (row.message as string) ?? '',
    entityType: (row.entityType ?? row.entity_type) as CRMNotification['entityType'] | undefined,
    entityId: (row.entityId ?? row.entity_id) as string | undefined,
    userId: (row.userId ?? row.user_id ?? '') as string,
    triggeredBy: (row.triggeredBy ?? row.triggered_by) as string | undefined,
    isRead: (row.isRead ?? row.is_read ?? false) as boolean,
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
  }
}

interface NotificationsStore {
  notifications: CRMNotification[]
  isLoading: boolean
  error: string | null
  disabledTypes: Set<NotificationType>

  fetchNotifications: () => Promise<void>
  notify: (
    type: NotificationType,
    title: string,
    message: string,
    opts?: {
      entityType?: CRMNotification['entityType']
      entityId?: string
      triggeredBy?: string
      userId?: string
    }
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  getUnreadCount: () => number
  getUnread: () => CRMNotification[]
  getByEntity: (entityType: string, entityId: string) => CRMNotification[]
  toggleType: (type: NotificationType) => void
  isTypeEnabled: (type: NotificationType) => boolean
}

export const useNotificationsStore = create<NotificationsStore>()(
  (set, get) => ({
    notifications: [],
    isLoading: false,
    error: null,
    disabledTypes: new Set<NotificationType>(),

    fetchNotifications: async () => {
      set({ isLoading: true, error: null })
      try {
        const data = await api.get<CRMNotification[]>('/notifications')
        set({ notifications: (data ?? []).map((r) => mapNotification(r as unknown as Record<string, unknown>)).slice(0, MAX_NOTIFICATIONS), isLoading: false })
      } catch (e: unknown) {
        set({ error: getErrorMessage(e), isLoading: false })
      }
    },

    notify: (type, title, message, opts) => {
      if (get().disabledTypes.has(type)) return
      const currentUser = useAuthStore.getState().currentUser
      const notification: CRMNotification = {
        id: crypto.randomUUID(),
        type,
        title,
        message,
        entityType: opts?.entityType,
        entityId: opts?.entityId,
        userId: opts?.userId || currentUser?.id || 'system',
        triggeredBy: opts?.triggeredBy || currentUser?.name || 'System',
        isRead: false,
        createdAt: new Date().toISOString(),
      }
      // Only surface locally when the recipient is the current viewer; otherwise a
      // notification addressed to another user (e.g. manager-targeted maintenance
      // alerts) would pollute this feed and inflate the unread badge until refetch.
      if (notification.userId === (currentUser?.id ?? 'system')) {
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
        }))
      }
      api.post('/notifications', notification).catch(() => {})
    },

    markAsRead: (id) => {
      const prev = get().notifications
      set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      }))
      api.patch(`/notifications/${id}`, { isRead: true }).catch((e: unknown) => set({ notifications: prev, error: getErrorMessage(e) }))
    },

    markAllAsRead: () => {
      const prev = get().notifications
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }))
      api.post('/notifications/mark-all-read', {}).catch((e: unknown) => set({ notifications: prev, error: getErrorMessage(e) }))
    },

    deleteNotification: (id) => {
      const prev = get().notifications
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
      api.delete(`/notifications/${id}`).catch((e: unknown) => set({ notifications: prev, error: getErrorMessage(e) }))
    },

    clearAll: () => {
      const prev = get().notifications
      set({ notifications: [] })
      api.delete('/notifications').catch((e: unknown) => set({ notifications: prev, error: getErrorMessage(e) }))
    },

    getUnreadCount: () => get().notifications.filter((n) => !n.isRead).length,
    getUnread: () => get().notifications.filter((n) => !n.isRead),
    getByEntity: (entityType, entityId) =>
      get().notifications.filter((n) => n.entityType === entityType && n.entityId === entityId),

    toggleType: (type) => {
      set((state) => {
        const next = new Set(state.disabledTypes)
        if (next.has(type)) next.delete(type)
        else next.add(type)
        return { disabledTypes: next }
      })
    },

    isTypeEnabled: (type) => !get().disabledTypes.has(type),
  })
)
