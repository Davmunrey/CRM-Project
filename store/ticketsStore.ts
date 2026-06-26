import { create } from 'zustand'
import { api } from '../lib/api'
import { toast } from './toastStore'
import { getTranslations } from '../i18n'

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  contactId: string | null
  companyId: string | null
  assignedTo: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

interface CreateTicketInput {
  subject: string
  description?: string
  priority?: TicketPriority
  assignedTo?: string
}
type TicketPatch = Partial<Pick<Ticket, 'status' | 'priority' | 'assignedTo' | 'subject' | 'description'>>

interface TicketsState {
  tickets: Ticket[]
  loading: boolean
  fetchTickets: () => Promise<void>
  createTicket: (data: CreateTicketInput) => Promise<boolean>
  updateTicket: (id: string, patch: TicketPatch) => Promise<void>
  deleteTicket: (id: string) => Promise<void>
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  tickets: [],
  loading: false,

  fetchTickets: async () => {
    set({ loading: true })
    try {
      const res = await api.get<{ data: Ticket[] }>('/tickets')
      set({ tickets: res?.data ?? [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createTicket: async (data) => {
    try {
      const ticket = await api.post<Ticket>('/tickets', data)
      if (ticket?.id) set((s) => ({ tickets: [ticket, ...s.tickets] }))
      toast.success(getTranslations().tickets.created)
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
      return false
    }
  },

  updateTicket: async (id, patch) => {
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    try {
      await api.patch(`/tickets/${id}`, patch)
    } catch {
      void get().fetchTickets()
    }
  },

  deleteTicket: async (id) => {
    set((s) => ({ tickets: s.tickets.filter((t) => t.id !== id) }))
    try {
      await api.delete(`/tickets/${id}`)
    } catch {
      void get().fetchTickets()
    }
  },
}))
