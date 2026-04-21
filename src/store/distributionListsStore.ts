import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

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
  addList: (data: Omit<DistributionList, 'id' | 'createdAt' | 'updatedAt'>) => DistributionList
  updateList: (id: string, updates: Partial<Pick<DistributionList, 'name' | 'memberIds'>>) => void
  deleteList: (id: string) => void
  getListsForEntity: (entityType: DistributionListEntity) => DistributionList[]
}

export const useDistributionListsStore = create<DistributionListsStore>()(
  persist(
    (set, get) => ({
      lists: [],

      addList: (data) => {
        const ts = new Date().toISOString()
        const list: DistributionList = { ...data, id: uuidv4(), createdAt: ts, updatedAt: ts }
        set((s) => ({ lists: [...s.lists, list] }))
        return list
      },

      updateList: (id, updates) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l,
          ),
        }))
      },

      deleteList: (id) => {
        set((s) => ({ lists: s.lists.filter((l) => l.id !== id) }))
      },

      getListsForEntity: (entityType) => get().lists.filter((l) => l.entityType === entityType),
    }),
    { name: 'crm_distribution_lists' },
  ),
)
