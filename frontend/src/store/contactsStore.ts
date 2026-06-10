import { create } from 'zustand'
import type { Contact, ContactFilters } from '../types'
import { useAuditStore } from './auditStore'
import { getTranslations } from '../i18n'
import { api } from '../lib/api'
import { getErrorMessage } from '../lib/supabaseHelpers'
import { toast } from './toastStore'

export function mapContactFromRow(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    firstName: (row.firstName ?? row.first_name ?? '') as string,
    lastName: (row.lastName ?? row.last_name ?? '') as string,
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? '',
    jobTitle: (row.jobTitle ?? row.job_title ?? '') as string,
    companyId: (row.companyId ?? row.company_id ?? '') as string,
    status: (row.status as Contact['status']) ?? 'prospect',
    source: (row.source as Contact['source']) ?? 'other',
    tags: (row.tags as string[]) ?? [],
    assignedTo: (row.assignedTo ?? row.assigned_to ?? '') as string,
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
    updatedAt: (row.updatedAt ?? row.updated_at ?? '') as string,
    lastContactedAt: (row.lastContactedAt ?? row.last_contacted_at ?? '') as string,
    notes: (row.notes as string) ?? '',
    linkedDeals: (row.linkedDeals ?? row.linked_deals ?? []) as string[],
    avatar: (row.avatar as string) ?? undefined,
    marketingOptIn: (row.marketingOptIn ?? row.marketing_opt_in ?? false) as boolean,
    marketingOptInAt: (row.marketingOptInAt ?? row.marketing_opt_in_at) as string | undefined,
    marketingOptInSource: (row.marketingOptInSource ?? row.marketing_opt_in_source) as string | undefined,
    linkedinUrl: (row.linkedinUrl ?? row.linkedin_url) as string | undefined,
  }
}

export interface ContactsState {
  contacts: Contact[]
  filters: ContactFilters
  selectedId: string | null
  isLoading: boolean
  error: string | null

  fetchContacts: () => Promise<void>
  addContact: (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Contact
  updateContact: (id: string, updates: Partial<Contact>) => void
  deleteContact: (id: string) => void
  bulkDelete: (ids: string[]) => void
  setFilter: (key: keyof ContactFilters, value: string | string[]) => void
  clearFilters: () => void
  setSelectedId: (id: string | null) => void

  getById: (id: string) => Contact | undefined
  getFilteredContacts: () => Contact[]
}

const defaultFilters: ContactFilters = {
  search: '',
  status: '',
  source: '',
  tags: [],
  assignedTo: '',
  dateFrom: '',
  dateTo: '',
}

export const useContactsStore = create<ContactsState>()(
  (set, get) => ({
    contacts: [],
    filters: defaultFilters,
    selectedId: null,
    isLoading: false,
    error: null,

    fetchContacts: async () => {
      set({ isLoading: true, error: null })
      try {
        const res = await api.get<{ data: Contact[] } | Contact[]>('/contacts')
        const rows = (res && !Array.isArray(res) && 'data' in res) ? res.data : (res as Contact[] ?? [])
        set({ contacts: rows.map((r) => mapContactFromRow(r as unknown as Record<string, unknown>)), isLoading: false })
      } catch (e: unknown) {
        set({ error: getErrorMessage(e), isLoading: false })
      }
    },

    addContact: (contactData) => {
      const now = new Date().toISOString()
      const tempId = crypto.randomUUID()
      const optimistic: Contact = { ...contactData, id: tempId, createdAt: now, updatedAt: now }
      set((s) => ({ contacts: [optimistic, ...s.contacts] }))
      useAuditStore.getState().logAction('contact_created', 'contact', tempId, contactData.firstName + ' ' + contactData.lastName, getTranslations().auditMessages.contactCreated)

      api.post<Contact>('/contacts', contactData).then(
        (real) => {
          set((s) => ({ contacts: s.contacts.map((c) => c.id === tempId ? mapContactFromRow(real as unknown as Record<string, unknown>) : c) }))
        },
        (err: unknown) => {
          // Roll back the optimistic insert so no phantom row with a temp id
          // (which would 404 on later edit/delete) lingers in the list.
          const message = getErrorMessage(err)
          set((s) => ({ contacts: s.contacts.filter((c) => c.id !== tempId), error: message }))
          toast.error(message)
        },
      )

      return optimistic
    },

    updateContact: (id, updates) => {
      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      }))
      useAuditStore.getState().logAction('contact_updated', 'contact', id, '', getTranslations().auditMessages.contactUpdated)
      api.patch(`/contacts/${id}`, updates).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    deleteContact: (id) => {
      set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) }))
      useAuditStore.getState().logAction('contact_deleted', 'contact', id, '', getTranslations().auditMessages.contactDeleted)
      api.delete(`/contacts/${id}`).catch((e: unknown) => set({ error: getErrorMessage(e) }))
    },

    bulkDelete: (ids) => {
      const idSet = new Set(ids)
      set((state) => ({ contacts: state.contacts.filter((c) => !idSet.has(c.id)) }))
      Promise.all(ids.map((id) => api.delete(`/contacts/${id}`))).catch((e: unknown) => set({ error: getErrorMessage(e) }))
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
      return get().contacts.find((c) => c.id === id)
    },

    getFilteredContacts: () => {
      const { contacts, filters } = get()
      return contacts.filter((c) => {
        const q = filters.search.toLowerCase()
        if (q) {
          const name = `${c.firstName} ${c.lastName}`.toLowerCase()
          const email = c.email.toLowerCase()
          if (!name.includes(q) && !email.includes(q)) return false
        }
        if (filters.status && c.status !== filters.status) return false
        if (filters.source && c.source !== filters.source) return false
        if (filters.assignedTo && c.assignedTo !== filters.assignedTo) return false
        if (filters.tags.length > 0 && !filters.tags.some((t) => c.tags.includes(t))) return false
        if (filters.dateFrom && c.createdAt < filters.dateFrom) return false
        if (filters.dateTo && c.createdAt > filters.dateTo) return false
        return true
      })
    },
  })
)
