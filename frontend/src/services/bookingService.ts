import { api } from '../lib/api'

export interface AvailabilityRule {
  dow: number // 0=Sun .. 6=Sat
  start: string // 'HH:MM'
  end: string // 'HH:MM'
}

export interface BookingPage {
  id: string
  slug: string
  tokenPrefix: string
  title: string
  description?: string
  durationMinutes: number
  timezone?: string
  availability?: AvailabilityRule[]
  minNoticeMinutes?: number
  maxDaysAhead?: number
  createLead?: boolean
  enabled: boolean
  bookingCount: number
  createdAt: string
}

export interface BookingPagePatch {
  title?: string
  description?: string
  durationMinutes?: number
  timezone?: string
  availability?: AvailabilityRule[]
  minNoticeMinutes?: number
  maxDaysAhead?: number
  createLead?: boolean
  enabled?: boolean
}

export const bookingApi = {
  list: async (): Promise<BookingPage[]> => {
    const r = await api.get<{ data: BookingPage[] }>('/booking-pages')
    return r?.data ?? []
  },
  create: (title?: string) =>
    api.post<{ page: BookingPage; token: string }>('/booking-pages', title ? { title } : {}),
  update: (id: string, patch: BookingPagePatch) => api.patch<BookingPage>(`/booking-pages/${id}`, patch),
  remove: (id: string) => api.delete(`/booking-pages/${id}`),
}
