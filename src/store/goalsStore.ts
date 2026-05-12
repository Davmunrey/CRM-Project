import { create } from 'zustand'
import type { SalesGoal } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { devConsole } from '../lib/devConsole'
import { getOrgId, sbDelete } from '../lib/supabaseHelpers'
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

function rowToGoal(r: Record<string, unknown>): SalesGoal {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as SalesGoal['type'],
    target: r.target as number,
    current: r.current as number,
    period: r.period as SalesGoal['period'],
    startDate: r.start_date as string,
    endDate: r.end_date as string,
  }
}

export const useGoalsStore = create<GoalsState>()((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  fetchGoals: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ goals: [] })
      return
    }
    set({ isLoading: true, error: null })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      const { data, error } = await (supabase as any).from('sales_goals').select('*').order('created_at', { ascending: false })
      if (error) throw error
      set({ goals: (data ?? []).map(rowToGoal), isLoading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  addGoal: async (goalData) => {
    const currentUserId = useAuthStore.getState().currentUser?.id
    const effectiveUserId = goalData.userId || currentUserId || 'unknown-user'
    const goal: SalesGoal = { ...goalData, id: crypto.randomUUID() }
    goal.userId = effectiveUserId
    set((s) => ({ goals: [...s.goals, goal] }))
    if (isSupabaseConfigured && supabase) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      const { error } = await (supabase as any).from('sales_goals').insert({
        id: goal.id, user_id: goal.userId, type: goal.type,
        target: goal.target, current: goal.current, period: goal.period,
        start_date: goal.startDate, end_date: goal.endDate,
        organization_id: getOrgId(),
      })
      if (error) {
        devConsole.error('[goalsStore] insert error', error)
        set((s) => ({ goals: s.goals.filter((g) => g.id !== goal.id), error: error.message }))
        return { error: error.message as string }
      }
    }
    return { goal }
  },

  updateGoal: (id, updates) => {
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }))
    if (isSupabaseConfigured && supabase) {
      const row: Record<string, unknown> = {}
      if (updates.userId !== undefined) row.user_id = updates.userId
      if (updates.type !== undefined) row.type = updates.type
      if (updates.target !== undefined) row.target = updates.target
      if (updates.current !== undefined) row.current = updates.current
      if (updates.period !== undefined) row.period = updates.period
      if (updates.startDate !== undefined) row.start_date = updates.startDate
      if (updates.endDate !== undefined) row.end_date = updates.endDate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase client lacks generated types for this table
      ;(supabase as any).from('sales_goals').update(row).eq('id', id)
        .then(({ error }: { error: Error | null }) => { if (error) devConsole.error('[goalsStore] update error', error) })
    }
  },

  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
    if (isSupabaseConfigured && supabase) {
      sbDelete('sales_goals', id).catch((e) => devConsole.error('[goalsStore] delete error', e))
    }
  },

  getActiveGoals: () => {
    const now = new Date().toISOString().split('T')[0]
    return get().goals.filter((g) => g.startDate <= now && g.endDate >= now)
  },
}))
