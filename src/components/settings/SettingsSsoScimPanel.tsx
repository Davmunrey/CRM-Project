import { useEffect, useState } from 'react'
import { Shield, KeyRound, Plus } from 'lucide-react'
import { useTranslations } from '../../i18n'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function SettingsSsoScimPanel() {
  const t = useTranslations()
  const organizationId = useAuthStore((s) => s.organizationId)
  const [domain, setDomain] = useState('')
  const [domains, setDomains] = useState<Array<{ id: string; domain: string; verified_at: string | null }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !organizationId) return
    void (supabase as any)
      .from('organization_sso_domains')
      .select('id,domain,verified_at')
      .eq('organization_id', organizationId)
      .then(({ data }: { data: unknown[] | null }) =>
        setDomains((data as Array<{ id: string; domain: string; verified_at: string | null }>) ?? []),
      )
  }, [organizationId])

  const addDomain = async () => {
    if (!supabase || !organizationId || !domain.trim()) return
    setLoading(true)
    const { data } = await (supabase as any).from('organization_sso_domains').insert({
      organization_id: organizationId,
      domain: domain.trim().toLowerCase(),
      verification_token: crypto.randomUUID().replaceAll('-', ''),
    }).select('id,domain,verified_at').single()
    if (data) setDomains((s) => [data as { id: string; domain: string; verified_at: string | null }, ...s])
    setDomain('')
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-fg/10 bg-surface-1/60 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <Shield size={16} className="text-accent-400 shrink-0" aria-hidden />
        {t.settings.tabSecurity} — SSO / SCIM
      </div>
      <p className="text-xs text-fg-subtle leading-relaxed">
        Configure SAML/OIDC in Supabase Auth and register verified domains below for JIT provisioning.
      </p>
      <div className="flex items-end gap-2">
        <Input label="SSO domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="company.com" />
        <Button type="button" onClick={() => void addDomain()} disabled={loading} leftIcon={<Plus size={14} />}>
          Add
        </Button>
      </div>
      <div className="space-y-1">
        {domains.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-md border border-fg/10 px-2 py-1 text-xs">
            <span>{d.domain}</span>
            <span className={d.verified_at ? 'text-success' : 'text-warning'}>
              {d.verified_at ? 'verified' : 'pending'}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-fg/10 bg-surface-2/40 p-2 text-xs text-fg-subtle">
        <div className="flex items-center gap-1.5 text-fg">
          <KeyRound size={14} /> SCIM token
        </div>
        <p className="mt-1">Use `scim-v2` endpoint with bearer tokens from organization settings.</p>
      </div>
    </div>
  )
}
