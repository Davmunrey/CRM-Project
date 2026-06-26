import { create } from 'zustand'
import type { SalesGoal } from '../types'
import { api } from '../lib/api'
import { useAuthStore } from './authStore'

interface GoalsState {
  goals: SalesGoal[]
  isLoading: boolean
  error: string | null
  fetchGoals: () => Promise<void>
  addGoal: (goal: Omit<SalesGoal, 'id'>) => Promise<{ goal?: SalesGoal; error?: string }>
  updateGoal: (id: string, updates: Partial<SalesGoal>) => void
  deleteGoal: (id: string) => void
  getActiveGoals: () => SalesGoal[]
}

type ApiGoal = Record<string, unknown>

function rowToGoal(r: ApiGoal): SalesGoal {
  return {
    id: r.id as string,
    userId: ((r.userId ?? r.user_id) as string),
    type: (r.type as SalesGoal['type']),
    target: (r.target as number),
    current: (r.current as number),
    period: (r.period as SalesGoal['period']),
    startDate: ((r.startDate ?? r.start_date) as string),
    endDate: ((r.endDate ?? r.end_date) as string),
  }
}

export const useGoalsStore = create<GoalsState>()((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.get<ApiGoal[]>('/goals')
      set({ goals: (data ?? []).map(rowToGoal), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addGoal: async (goalData) => {
    const currentUserId = useAuthStore.getState().currentUser?.id
    const effectiveUserId = goalData.userId || currentUserId || 'unknown-user'
    const optimistic: SalesGoal = { ...goalData, id: crypto.randomUUID(), userId: effectiveUserId }
    set((s) => ({ goals: [...s.goals, optimistic] }))
    try {
      const created = await api.post<ApiGoal>('/goals', {
        userId: effectiveUserId,
        type: goalData.type,
        target: goalData.target,
        current: goalData.current,
        period: goalData.period,
        startDate: goalData.startDate,
        endDate: goalData.endDate,
      })
      const real = rowToGoal(created)
      set((s) => ({ goals: s.goals.map((g) => g.id === optimistic.id ? real : g) }))
      return { goal: real }
    } catch (e: unknown) {
      set((s) => ({ goals: s.goals.filter((g) => g.id !== optimistic.id), error: (e as Error).message }))
      return { error: (e as Error).message }
    }
  },

  updateGoal: (id, updates) => {
    const prev = get().goals
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }))
    api.patch(`/goals/${id}`, updates).catch((e: unknown) => set({ goals: prev, error: (e as Error).message }))
  },

  deleteGoal: (id) => {
    const prev = get().goals
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
    api.delete(`/goals/${id}`).catch((e: unknown) => set({ goals: prev, error: (e as Error).message }))
  },

  getActiveGoals: () => {
    const now = new Date().toISOString().split('T')[0]
    return get().goals.filter((g) => g.startDate <= now && g.endDate >= now)
  },
}))
