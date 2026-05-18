import { create } from 'zustand'
import type { Pipeline, PipelineStage } from '../types'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'

function mapPipeline(row: Record<string, unknown>): Pipeline {
  return {
    id: row.id as string,
    organizationId: (row.organizationId ?? row.organization_id) as string,
    name: row.name as string,
    description: row.description as string | undefined,
    isDefault: Boolean(row.isDefault ?? row.is_default),
    isArchived: Boolean(row.isArchived ?? row.is_archived),
    stages: (row.stages as PipelineStage[]) ?? [],
    viewAccess: (row.viewAccess ?? row.view_access ?? 'all') as Pipeline['viewAccess'],
    createdBy: (row.createdBy ?? row.created_by) as string | undefined,
    memberCount: (row.memberCount ?? row.member_count) as number | undefined,
    createdAt: (row.createdAt ?? row.created_at) as string,
    updatedAt: (row.updatedAt ?? row.updated_at) as string,
  }
}

interface PipelinesState {
  pipelines: Pipeline[]
  activePipelineId: string | null
  isLoading: boolean
  error: string | null

  fetchPipelines: () => Promise<void>
  createPipeline: (data: { name: string; description?: string; stages?: PipelineStage[]; view_access?: 'all' | 'members_only'; is_default?: boolean }) => Promise<Pipeline>
  updatePipeline: (id: string, data: Partial<{ name: string; description: string; stages: PipelineStage[]; view_access: 'all' | 'members_only'; is_default: boolean }>) => Promise<void>
  archivePipeline: (id: string) => Promise<void>
  addMember: (pipelineId: string, userId: string, role?: 'owner' | 'member') => Promise<void>
  removeMember: (pipelineId: string, userId: string) => Promise<void>

  setActivePipelineId: (id: string | null) => void
  getActivePipeline: () => Pipeline | null
  getActiveStages: () => PipelineStage[]
}

export const usePipelinesStore = create<PipelinesState>()((set, get) => ({
  pipelines: [],
  activePipelineId: null,
  isLoading: false,
  error: null,

  fetchPipelines: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.get<{ data: Pipeline[] } | Pipeline[]>('/pipelines')
      const rows = (res && !Array.isArray(res) && 'data' in res) ? res.data : (res as Pipeline[] ?? [])
      const pipelines = rows.map((r) => mapPipeline(r as unknown as Record<string, unknown>))
      const current = get().activePipelineId
      const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]
      set({
        pipelines,
        isLoading: false,
        activePipelineId: current && pipelines.some((p) => p.id === current) ? current : (defaultPipeline?.id ?? null),
      })
    } catch (e: unknown) {
      set({ error: getErrorMessage(e), isLoading: false })
    }
  },

  createPipeline: async (data) => {
    const raw = await api.post<Pipeline>('/pipelines', data)
    const pipeline = mapPipeline(raw as unknown as Record<string, unknown>)
    set((s) => ({ pipelines: [...s.pipelines, pipeline] }))
    return pipeline
  },

  updatePipeline: async (id, data) => {
    const raw = await api.patch<Pipeline>(`/pipelines/${id}`, data)
    const updated = mapPipeline(raw as unknown as Record<string, unknown>)
    set((s) => ({
      pipelines: s.pipelines.map((p) => {
        if (p.id !== id) {
          // If we set a new default, unset others
          if (data.is_default) return { ...p, isDefault: false }
          return p
        }
        return updated
      }),
    }))
  },

  archivePipeline: async (id) => {
    await api.delete(`/pipelines/${id}`)
    set((s) => ({
      pipelines: s.pipelines.filter((p) => p.id !== id),
      activePipelineId: s.activePipelineId === id
        ? (s.pipelines.find((p) => p.id !== id && p.isDefault)?.id ?? s.pipelines.find((p) => p.id !== id)?.id ?? null)
        : s.activePipelineId,
    }))
  },

  addMember: async (pipelineId, userId, role = 'member') => {
    await api.post(`/pipelines/${pipelineId}/members`, { userId, role })
  },

  removeMember: async (pipelineId, userId) => {
    await api.delete(`/pipelines/${pipelineId}/members/${userId}`)
  },

  setActivePipelineId: (id) => set({ activePipelineId: id }),

  getActivePipeline: () => {
    const { pipelines, activePipelineId } = get()
    return pipelines.find((p) => p.id === activePipelineId) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null
  },

  getActiveStages: () => {
    const pipeline = get().getActivePipeline()
    if (!pipeline) return []
    return [...pipeline.stages].sort((a, b) => a.order - b.order)
  },
}))
