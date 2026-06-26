import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '/api'

interface FormConfig {
  title: string
  description: string
  fields: string[]
  successMessage: string
}

// Public, external-facing form — labels are intentionally fixed English (the form
// owner sets the title/success copy via config; this page has no app locale).
const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  company: 'Company',
  phone: 'Phone',
  message: 'Message',
}

type Status = 'loading' | 'ready' | 'notfound' | 'submitting' | 'done' | 'error'

export function PublicLeadForm() {
  const { token } = useParams<{ token: string }>()
  const [config, setConfig] = useState<FormConfig | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [values, setValues] = useState<Record<string, string>>({})
  const [hp, setHp] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('notfound')
      return
    }
    fetch(`${API_BASE}/public/forms/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('notfound'))))
      .then((c: FormConfig) => {
        setConfig(c)
        setStatus('ready')
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  const set = (field: string, v: string) => setValues((prev) => ({ ...prev, [field]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setStatus('submitting')
    try {
      const res = await fetch(`${API_BASE}/public/forms/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, _hp: hp }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-fg/10 bg-surface-1 p-6 shadow-brand-sm">
        {status === 'loading' && <p className="text-center text-sm text-fg-subtle">Loading…</p>}

        {status === 'notfound' && (
          <p className="text-center text-sm text-fg-muted">This form is unavailable.</p>
        )}

        {status === 'done' && (
          <div className="text-center space-y-2 py-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">✓</div>
            <p className="text-sm text-fg">{config?.successMessage ?? 'Thank you!'}</p>
          </div>
        )}

        {(status === 'ready' || status === 'submitting' || status === 'error') && config && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="text-lg font-bold text-fg">{config.title}</h1>
              {config.description && <p className="mt-1 text-sm text-fg-muted">{config.description}</p>}
            </div>

            {config.fields.map((field) => (
              <div key={field}>
                <label htmlFor={`f-${field}`} className="mb-1 block text-sm font-medium text-fg-muted">
                  {FIELD_LABELS[field] ?? field}
                  {field === 'email' && <span className="text-danger"> *</span>}
                </label>
                {field === 'message' ? (
                  <textarea
                    id={`f-${field}`}
                    value={values[field] ?? ''}
                    onChange={(e) => set(field, e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                ) : (
                  <input
                    id={`f-${field}`}
                    type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                    required={field === 'email'}
                    value={values[field] ?? ''}
                    onChange={(e) => set(field, e.target.value)}
                    className="w-full rounded-xl border border-fg/10 bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-500/40"
                  />
                )}
              </div>
            ))}

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

            {status === 'error' && <p className="text-sm text-danger">Something went wrong. Please try again.</p>}

            <Button type="submit" className="w-full" loading={status === 'submitting'} disabled={status === 'submitting'}>
              Submit
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
