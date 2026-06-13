import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

interface BookingConfig {
  title: string
  description: string
  durationMinutes: number
  timezone: string
  maxDaysAhead: number
}

type Status = 'loading' | 'notfound' | 'ready' | 'done'

// Public, external-facing page — labels are intentionally fixed English (the page
// owner configures only the title/description; this page has no app locale).
// Availability is treated as UTC in v1, so slots are displayed in UTC for consistency.
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
const todayStr = () => new Date().toISOString().slice(0, 10)
const addDaysStr = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

export function PublicBooking() {
  const { token } = useParams<{ token: string }>()
  const [config, setConfig] = useState<BookingConfig | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [hp, setHp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [cancelToken, setCancelToken] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('notfound')
      return
    }
    fetch(`${API_BASE}/public/booking/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('notfound'))))
      .then((c: BookingConfig) => {
        setConfig(c)
        setStatus('ready')
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  // Load open slots whenever the chosen date changes.
  useEffect(() => {
    if (!token || status !== 'ready') return
    setSlotsLoading(true)
    setPicked(null)
    fetch(`${API_BASE}/public/booking/${encodeURIComponent(token)}/slots?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('slots'))))
      .then((d: { slots: string[] }) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [token, date, status])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !picked) return
    setSubmitting(true)
    setErrMsg(null)
    try {
      const res = await fetch(`${API_BASE}/public/booking/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: picked, name, email, notes, _hp: hp }),
      })
      if (!res.ok) throw new Error('failed')
      const d = (await res.json()) as { cancelToken?: string; startAt?: string }
      setConfirmedAt(d.startAt ?? picked)
      setCancelToken(d.cancelToken ?? null)
      setStatus('done')
    } catch {
      setErrMsg('That time may no longer be available. Please pick another.')
      // Refresh the slot list so the taken slot disappears.
      fetch(`${API_BASE}/public/booking/${encodeURIComponent(token)}/slots?date=${date}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('slots'))))
        .then((dd: { slots: string[] }) => setSlots(dd.slots ?? []))
        .catch(() => undefined)
      setPicked(null)
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async () => {
    if (!cancelToken) return
    try {
      await fetch(`${API_BASE}/public/booking/cancel/${encodeURIComponent(cancelToken)}`, { method: 'POST' })
      setCancelled(true)
    } catch {
      /* best effort */
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-fg/10 bg-surface-1 p-6 shadow-brand-sm">
        {status === 'loading' && <p className="text-center text-sm text-fg-subtle">Loading…</p>}

        {status === 'notfound' && <p className="text-center text-sm text-fg-muted">This booking link is unavailable.</p>}

        {status === 'done' && (
          <div className="text-center space-y-3 py-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">✓</div>
            {cancelled ? (
              <p className="text-sm text-fg">Your booking has been cancelled.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-fg">You&apos;re booked!</p>
                {confirmedAt && (
                  <p className="text-sm text-fg-muted">
                    {fmtDay(confirmedAt)} · {fmtTime(confirmedAt)} UTC
                  </p>
                )}
                <p className="text-xs text-fg-subtle">A confirmation was sent to {email}.</p>
                {cancelToken && (
                  <button type="button" onClick={() => void cancel()} className="text-xs text-fg-subtle underline hover:text-danger">
                    Cancel this booking
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {status === 'ready' && config && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-fg">{config.title}</h1>
              {config.description && <p className="mt-1 text-sm text-fg-muted">{config.description}</p>}
              <p className="mt-1 text-xs text-fg-subtle">{config.durationMinutes} minutes · times shown in UTC</p>
            </div>

            <div>
              <label htmlFor="bk-date" className="mb-1 block text-sm font-medium text-fg-muted">
                Date
              </label>
              <input
                id="bk-date"
                type="date"
                min={todayStr()}
                max={addDaysStr(config.maxDaysAhead || 60)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              />
            </div>

            {errMsg && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{errMsg}</p>}

            <div>
              <p className="mb-1 text-sm font-medium text-fg-muted">Available times</p>
              {slotsLoading ? (
                <p className="text-sm text-fg-subtle">Loading…</p>
              ) : slots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-fg/12 p-4 text-center text-sm text-fg-subtle">No times available on this day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPicked(s)}
                      className={`rounded-lg border px-2 py-1.5 text-sm ${picked === s ? 'border-accent-500 bg-accent-600 text-fg' : 'border-fg/12 bg-surface-2 text-fg-muted hover:border-accent-500/50'}`}
                    >
                      {fmtTime(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {picked && (
              <form onSubmit={submit} className="space-y-3 border-t border-fg/8 pt-4">
                <div>
                  <label htmlFor="bk-name" className="mb-1 block text-sm font-medium text-fg-muted">
                    Name
                  </label>
                  <input
                    id="bk-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="bk-email" className="mb-1 block text-sm font-medium text-fg-muted">
                    Email<span className="text-danger"> *</span>
                  </label>
                  <input
                    id="bk-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="bk-notes" className="mb-1 block text-sm font-medium text-fg-muted">
                    Notes
                  </label>
                  <textarea
                    id="bk-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                </div>

                {/* Honeypot — hidden from humans, often filled by bots. */}
                <input
                  type="text"
                  name="company_website"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />

                <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
                  Confirm booking · {fmtTime(picked)} UTC
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
