import { api } from '../lib/api'

export type CalendarEvent = {
  id: string
  googleEventId: string
  googleCalendarId: string
  title: string
  description: string | null
  location: string | null
  startAt: string
  endAt: string
  allDay: boolean
  status: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink: string | null
  meetLink: string | null
  organizerEmail: string | null
  attendees: { email: string; displayName?: string; responseStatus?: string }[]
  contactId: string | null
  companyId: string | null
  dealId: string | null
  syncedAt: string
  updatedAt: string
}

export type GoogleCalendarListItem = {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export type CalendarSyncResult = {
  ok: boolean
  upserted: number
  deleted: number
  total: number
}

export type CreateCalendarEventInput = {
  title: string
  description?: string
  location?: string
  startAt: string
  endAt: string
  allDay?: boolean
  calendarId?: string
  attendeeEmails?: string[]
  addMeet?: boolean
  contact_id?: string
  company_id?: string
  deal_id?: string
}

export type UpdateCalendarEventInput = {
  title?: string
  description?: string | null
  location?: string | null
  startAt?: string
  endAt?: string
  contact_id?: string | null
  company_id?: string | null
  deal_id?: string | null
}

export async function listCalendarEvents(params?: {
  from?: string
  to?: string
  contactId?: string
  dealId?: string
  limit?: number
}): Promise<CalendarEvent[]> {
  const q = new URLSearchParams()
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.contactId) q.set('contact_id', params.contactId)
  if (params?.dealId) q.set('deal_id', params.dealId)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  const data = await api.get<{ data: CalendarEvent[] }>(`/calendar/${qs ? `?${qs}` : ''}`)
  return (data as { data: CalendarEvent[] }).data ?? []
}

export async function syncCalendarEvents(options?: {
  calendarId?: string
  daysBack?: number
  daysAhead?: number
}): Promise<CalendarSyncResult> {
  return api.post<CalendarSyncResult>('/calendar/sync', {
    calendarId: options?.calendarId ?? 'primary',
    daysBack: options?.daysBack ?? 30,
    daysAhead: options?.daysAhead ?? 90,
  })
}

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
  return api.post<CalendarEvent>('/calendar/', input)
}

export async function updateCalendarEvent(
  id: string,
  input: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  return api.patch<CalendarEvent>(`/calendar/${id}`, input)
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await api.delete(`/calendar/${id}`)
}

export async function listGoogleCalendars(): Promise<GoogleCalendarListItem[]> {
  const data = await api.get<{ data: GoogleCalendarListItem[] }>('/calendar/list')
  return (data as { data: GoogleCalendarListItem[] }).data ?? []
}

export async function startCalendarWatch(calendarId = 'primary'): Promise<{ ok: boolean; channelId: string; expiresAt: string }> {
  return api.post('/calendar/watch', { calendarId })
}

export async function stopCalendarWatch(calendarId = 'primary'): Promise<void> {
  await api.delete(`/calendar/watch?calendarId=${encodeURIComponent(calendarId)}`)
}
