import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

export type DistributionListEntity = 'contact' | 'company'

export interface DistributionList {
  id: string
  name: string
  entityType: DistributionListEntity
  memberIds: string[]
  createdAt: string
  updatedAt: string
}

interface DistributionListsStore {
  lists: DistributionList[]
  loadLists: () => Promise<void>
  addList: (data: Omit<DistributionList, 'id' | 'createdAt' | 'updatedAt'>) => DistributionList
  updateList: (id: string, updates: Partial<Pick<DistributionList, 'name' | 'memberIds'>>) => void
  deleteList: (id: string) => void
  getListsForEntity: (entityType: DistributionListEntity) => DistributionList[]
}

function rowToList(r: Record<string, unknown>): DistributionList {
  return {
    id: r.id as string,
    name: r.name as string,
    entityType: r.entityType as DistributionListEntity,
    memberIds: (r.memberIds as string[]) ?? [],
    createdAt: r.createdAt as string,
    updatedAt: r.updatedAt as string,
  }
}

export const useDistributionListsStore = create<DistributionListsStore>()(
  persist(
    (set, get) => ({
      lists: [],

      loadLists: async () => {
        try {
          const res = await api.get<{ data: Record<string, unknown>[] }>('/distribution-lists')
          set({ lists: res.data.map(rowToList) })
        } catch {
          // keep persisted data on failure
        }
      },

      addList: (data) => {
        const ts = new Date().toISOString()
        const list: DistributionList = { ...data, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts }
        set((s) => ({ lists: [...s.lists, list] }))
        api.post('/distribution-lists', {
          name: data.name,
          entityType: data.entityType,
          memberIds: data.memberIds,
        }).then((row) => {
          const saved = rowToList(row as Record<string, unknown>)
          set((s) => ({ lists: s.lists.map((l) => (l.id === list.id ? saved : l)) }))
        }).catch(() => undefined)
        return list
      },

      updateList: (id, updates) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l,
          ),
        }))
        api.patch(`/distribution-lists/${id}`, updates).catch(() => undefined)
      },

      deleteList: (id) => {
        set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }))
        api.delete(`/distribution-lists/${id}`).catch(() => undefined)
      },

      getListsForEntity: (entityType) => get().lists.filter((l) => l.entityType === entityType),
    }),
    { name: 'crm_distribution_lists' },
  ),
)
