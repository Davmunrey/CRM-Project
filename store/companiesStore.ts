import { create } from 'zustand'
import type { Company, CompanyFilters } from '../types'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'
import { normalizeIndustryValue } from '../lib/industries'

function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    domain: (row.domain as string) ?? '',
    industry: normalizeIndustryValue(String(row.industry ?? '')),
    size: (row.size as string) ?? '',
    country: (row.country as string) ?? '',
    city: (row.city as string) ?? '',
    website: (row.website as string) ?? '',
    phone: (row.phone as string) ?? '',
    status: (row.status as Company['status']) ?? 'prospect',
    revenue: (row.revenue as number) ?? undefined,
    contacts: (row.contacts as string[]) ?? [],
    deals: (row.deals as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    notes: (row.notes as string) ?? '',
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
    updatedAt: (row.updatedAt ?? row.updated_at ?? '') as string,
  }
}

export interface CompaniesState {
  companies: Company[]
  filters: CompanyFilters
  selectedId: string | null
  isLoading: boolean
  error: string | null

  fetchCompanies: () => Promise<void>
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Company
  updateCompany: (id: string, updates: Partial<Company>) => void
  deleteCompany: (id: string) => void
  setFilter: (key: keyof CompanyFilters, value: string) => void
  clearFilters: () => void
  setSelectedId: (id: string | null) => void

  getById: (id: string) => Company | undefined
  getFilteredCompanies: () => Company[]
}

const defaultFilters: CompanyFilters = {
  search: '',
  industry: '',
  size: '',
  status: '',
  country: '',
}

export const useCompaniesStore = create<CompaniesState>()(
  (set, get) => ({
    companies: [],
    filters: defaultFilters,
    selectedId: null,
    isLoading: false,
    error: null,

    fetchCompanies: async () => {
      set({ isLoading: true, error: null })
      try {
        const res = await api.get<{ data: Company[] } | Company[]>('/companies')
        const rows = (res && !Array.isArray(res) && 'data' in res) ? res.data : (res as Company[] ?? [])
        set({ companies: rows.map((r) => mapCompany(r as unknown as Record<string, unknown>)), isLoading: false })
      } catch (e: unknown) {
        set({ error: getErrorMessage(e), isLoading: false })
      }
    },

    addCompany: (companyData) => {
      const now = new Date().toISOString()
      const id = crypto.randomUUID()
      const company: Company = { ...companyData, id, createdAt: now, updatedAt: now }
      set((state) => ({ companies: [company, ...state.companies] }))

      api.post<Company>('/companies', companyData).then(
        (real) => {
          set((s) => ({ companies: s.companies.map((c) => c.id === id ? mapCompany(real as unknown as Record<string, unknown>) : c) }))
        },
        (err: unknown) => {
          set((s) => ({ companies: s.companies.filter((c) => c.id !== id), error: getErrorMessage(err) }))
        },
      )

      return company
    },

    updateCompany: (id, updates) => {
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      }))
      api.patch(`/companies/${id}`, updates).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    deleteCompany: (id) => {
      set((state) => ({ companies: state.companies.filter((c) => c.id !== id) }))
      api.delete(`/companies/${id}`).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    setFilter: (key, value) => {
      set((state) => ({ filters: { ...state.filters, [key]: value } }))
    },

    clearFilters: () => {
      set({ filters: defaultFilters })
    },

    setSelectedId: (id) => {
      set({ selectedId: id })
    },

    getById: (id) => {
      return get().companies.find((c) => c.id === id)
    },

    getFilteredCompanies: () => {
      const { companies, filters } = get()
      return companies.filter((c) => {
        const q = filters.search.toLowerCase()
        if (q && !c.name.toLowerCase().includes(q) && !c.domain.toLowerCase().includes(q)) return false
        if (filters.industry && c.industry !== filters.industry) return false
        if (filters.size && c.size !== filters.size) return false
        if (filters.status && c.status !== filters.status) return false
        if (filters.country && !c.country.toLowerCase().includes(filters.country.toLowerCase())) return false
        return true
      })
    },
  })
)
