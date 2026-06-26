export type UxActionName =
  | 'auth_login_attempt'
  | 'auth_login_success'
  | 'auth_login_error'
  | 'auth_password_reset_request_attempt'
  | 'auth_password_reset_request_success'
  | 'auth_password_reset_request_error'
  | 'auth_password_reset_complete_attempt'
  | 'auth_password_reset_complete_success'
  | 'auth_password_reset_complete_error'
  | 'onboarding_org_setup_submit_attempt'
  | 'onboarding_org_setup_submit_success'
  | 'onboarding_org_setup_submit_error'
  | 'quick_create_contact'
  | 'quick_create_deal'
  | 'quick_create_activity'
  | 'inbox_search'
  | 'inbox_load_more'
  | 'activity_complete'
  | 'activity_edit'
  | 'activity_delete'
  | 'onboarding_checklist_toggle'
  | 'onboarding_banner_dismiss'
  | 'onboarding_checklist_reset'

export interface UxMetricEvent {
  action: UxActionName
  timestamp: string
  meta?: Record<string, string | number | boolean | null>
}

const LS_KEY = 'crm_ux_metrics_v1'
const MAX_EVENTS = 400

export function trackUxAction(action: UxActionName, meta?: UxMetricEvent['meta']) {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const existing: UxMetricEvent[] = raw ? (JSON.parse(raw) as UxMetricEvent[]) : []
    const next: UxMetricEvent[] = [
      ...existing,
      { action, timestamp: new Date().toISOString(), meta },
    ].slice(-MAX_EVENTS)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {
    // Non-blocking telemetry helper.
  }
}

export function getUxEvents(): UxMetricEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UxMetricEvent[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((event) => typeof event?.action === 'string' && typeof event?.timestamp === 'string')
      .slice(-MAX_EVENTS)
  } catch {
    return []
  }
}

export function getUxActionCount(action: UxActionName): number {
  return getUxEvents().reduce((acc, event) => acc + (event.action === action ? 1 : 0), 0)
}

/** Post queued UX events to the Propel API and clear local queue on success. */
export async function flushUxMetricsToServer(): Promise<void> {
  const events = getUxEvents()
  if (events.length === 0) return
  try {
    const { api } = await import('./api')
    await api.post('/ux-metrics/ingest', { events })
    localStorage.removeItem(LS_KEY)
  } catch {
    // Non-blocking — events remain in localStorage for next flush
  }
}

