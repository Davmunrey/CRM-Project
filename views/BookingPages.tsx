import { useEffect, useState } from 'react'
import { CalendarClock, Plus, Trash2, Copy } from 'lucide-react'
import { bookingApi, type BookingPage, type AvailabilityRule } from '../services/bookingService'
import { useTranslations } from '../i18n'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/Button'

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon-first display
const weekdayLabel = (dow: number) => new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(Date.UTC(2023, 0, 1 + dow)))
const publicUrl = (token: string) => `${window.location.origin}/book/${token}`
const selectCls = 'rounded-lg border border-fg/10 bg-surface-2 px-2 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40'

export function BookingPages() {
  const t = useTranslations()
  const [pages, setPages] = useState<BookingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [newLink, setNewLink] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  // Per-day availability windows; presence of a dow key = that weekday is enabled.
  const [dayWindows, setDayWindows] = useState<Record<number, { start: string; end: string }>>({})
  const [duration, setDuration] = useState(30)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setPages(await bookingApi.list())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const create = async () => {
    try {
      const res = await bookingApi.create()
      if (res?.token) {
        setNewLink(publicUrl(res.token))
        if (res.page?.id) {
          // Seed sensible default availability so the link is immediately bookable.
          await bookingApi.update(res.page.id, { availability: [1, 2, 3, 4, 5].map((dow) => ({ dow, start: '09:00', end: '17:00' })) })
        }
      }
      toast.success(t.booking.created)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  const openEditor = (p: BookingPage) => {
    setEditId(p.id)
    const w: Record<number, { start: string; end: string }> = {}
    for (const a of p.availability ?? []) w[a.dow] = { start: a.start, end: a.end }
    setDayWindows(w)
    setDuration(p.durationMinutes ?? 30)
  }

  const toggleDay = (dow: number) =>
    setDayWindows((prev) => {
      const next = { ...prev }
      if (next[dow]) delete next[dow]
      else next[dow] = { start: '09:00', end: '17:00' }
      return next
    })
  const setDayField = (dow: number, field: 'start' | 'end', value: string) =>
    setDayWindows((prev) => (prev[dow] ? { ...prev, [dow]: { ...prev[dow], [field]: value } } : prev))

  const saveEditor = async (p: BookingPage) => {
    setSaving(true)
    try {
      const availability: AvailabilityRule[] = Object.entries(dayWindows)
        .map(([dow, w]) => ({ dow: Number(dow), start: w.start, end: w.end }))
        .sort((a, b) => a.dow - b.dow)
      await bookingApi.update(p.id, { availability, durationMinutes: duration })
      setEditId(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: BookingPage) => {
    if (!window.confirm(`${t.common.delete}?`)) return
    await bookingApi.remove(p.id)
    await load()
  }

  return (
    <div className="crm-page space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-accent-400" aria-hidden />
          <h1 className="text-lg font-bold text-fg">{t.booking.title}</h1>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => void create()}>
          {t.booking.newPage}
        </Button>
      </div>

      {newLink && (
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/8 p-4 space-y-2">
          <p className="text-sm font-medium text-fg">{t.booking.publicLink}</p>
          <code className="block break-all rounded-lg border border-border-subtle bg-surface-1 p-2 text-xs font-mono text-fg-muted">{newLink}</code>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" leftIcon={<Copy size={14} />} onClick={() => void navigator.clipboard.writeText(newLink).then(() => toast.success(t.common.copied))}>
              {t.booking.copyLink}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNewLink(null)}>
              {t.common.close}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-subtle">{t.common.loading}</p>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fg/12 p-10 text-center text-sm text-fg-subtle">{t.booking.empty}</div>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.id} className="rounded-xl border border-fg/8 bg-surface-1 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-fg">{p.title}</p>
                  <p className="text-[11px] text-fg-subtle">
                    {p.durationMinutes} min · {p.bookingCount} · {p.enabled ? t.common.active : t.common.inactive}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" size="sm" variant="ghost" onClick={() => (editId === p.id ? setEditId(null) : openEditor(p))}>
                    {t.booking.availability}
                  </Button>
                  <button type="button" onClick={() => void remove(p)} aria-label={t.common.delete} className="text-fg-subtle hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {editId === p.id && (
                <div className="space-y-3 rounded-lg bg-fg/[0.03] p-3">
                  {/* Per-day windows — each weekday keeps its own start/end (no longer flattened to one shared window). */}
                  <div className="space-y-1.5">
                    {DOW_ORDER.map((dow) => {
                      const win = dayWindows[dow]
                      return (
                        <div key={dow} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleDay(dow)}
                            className={`w-14 shrink-0 rounded-full px-2.5 py-1 text-xs ${win ? 'bg-accent-600 text-fg' : 'bg-fg/6 text-fg-muted'}`}
                          >
                            {weekdayLabel(dow)}
                          </button>
                          {win ? (
                            <>
                              <input type="time" className={selectCls} value={win.start} onChange={(e) => setDayField(dow, 'start', e.target.value)} />
                              <span className="text-xs text-fg-subtle">–</span>
                              <input type="time" className={selectCls} value={win.end} onChange={(e) => setDayField(dow, 'end', e.target.value)} />
                            </>
                          ) : (
                            <span className="text-xs text-fg-subtle">{t.common.inactive}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <label className="block text-xs text-fg-muted">
                    {t.booking.durationMinutes}
                    <select className={`${selectCls} block mt-1`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                      {[15, 30, 45, 60].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <Button type="button" size="sm" onClick={() => void saveEditor(p)} loading={saving}>
                    {t.common.save}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
