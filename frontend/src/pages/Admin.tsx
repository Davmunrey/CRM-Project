import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Users, BarChart3, KanbanSquare, Search, RefreshCw,
  ChevronDown, ChevronRight, Shield, Zap, Crown, LogIn, X,
  Package, Plus, Edit2, ToggleLeft, ToggleRight, Download, ClipboardList,
  PauseCircle, PlayCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { enterImpersonation } from '../components/layout/EnvironmentBanner'
import { Select } from '../components/ui/Select'
import { useAuthStore } from '../store/authStore'
import { formatDateShort } from '../utils/formatters'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  orgs: number
  users: number
  contacts: number
  deals: number
  activities: number
}

interface AdminOrg {
  id: string
  name: string
  slug: string
  domain: string | null
  plan: string
  planName: string | null
  logoUrl: string | null
  billingEmail: string | null
  billingCountry: string | null
  currency: string | null
  timezone: string | null
  createdAt: string
  updatedAt: string
  userCount: number | string
  contactCount: number | string
  dealCount: number | string
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  status: 'active' | 'suspended' | 'trial'
}

interface ImpersonationLog {
  id: string
  superAdminId: string
  superAdminName: string
  superAdminEmail: string
  targetOrgId: string
  targetOrgName: string
  targetUserId: string
  targetUserName: string
  targetUserEmail: string
  impersonatedAt: string
  endedAt: string | null
}

interface AdminOrgDetail extends AdminOrg {
  members: AdminMember[]
  billingVat: string | null
  primaryColor: string | null
  customDomain: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  subscriptionNotes: string | null
  trialEndsAt: string | null
  maxUsers: number | null
  maxContacts: number | null
  maxDeals: number | null
  planFeatures: Record<string, boolean> | null
  status: 'active' | 'suspended' | 'trial'
}

interface AdminMember {
  id: string
  email: string
  name: string
  role: string
  jobTitle: string | null
  avatarUrl: string | null
  isActive: boolean
  isSuperAdmin: boolean
  createdAt: string
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  isSuperAdmin: boolean
  createdAt: string
  orgName: string | null
  orgId: string | null
}

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  maxUsers: number
  maxContacts: number
  maxDeals: number
  maxPipelines: number
  features: Record<string, boolean>
  isActive: boolean
  sortOrder: number
}

type AdminTab = 'overview' | 'orgs' | 'users' | 'plans' | 'audit'

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="crm-surface-section p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-fg">{value.toLocaleString()}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-fg/8 text-fg-muted',
    pro: 'bg-info/15 text-info',
    enterprise: 'bg-accent-500/15 text-accent-400',
  }
  return (
    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${colors[plan] ?? 'bg-fg/8 text-fg-muted'}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-fg-subtle text-xs">—</span>
  const colors: Record<string, string> = {
    active: 'text-success',
    trialing: 'text-info',
    past_due: 'text-warning',
    canceled: 'text-danger',
    expired: 'text-fg-muted',
  }
  return <span className={`text-xs font-medium ${colors[status] ?? 'text-fg-muted'}`}>{status}</span>
}

function OrgStatusBadge({ status }: { status: 'active' | 'suspended' | 'trial' | undefined }) {
  if (!status || status === 'active') return null
  const styles: Record<string, string> = {
    suspended: 'bg-danger/15 text-danger',
    trial: 'bg-info/15 text-info',
  }
  return (
    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? ''}`}>
      {status}
    </span>
  )
}

// ── Org Detail Modal ──────────────────────────────────────────────────────────

function OrgDetailModal({ orgId, onClose, onRefresh }: { orgId: string; onClose: () => void; onRefresh: () => void }) {
  const [org, setOrg] = useState<AdminOrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState(false)
  const [planSlug, setPlanSlug] = useState('')
  const [subStatus, setSubStatus] = useState<'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'>('active')
  const [savingSub, setSavingSub] = useState(false)
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<AdminOrgDetail>(`/admin/orgs/${orgId}`)
      .then(setOrg)
      .catch(() => toast.error('Failed to load org'))
      .finally(() => setLoading(false))
  }, [orgId])

  useEffect(() => {
    if (org) {
      setPlanSlug(org.plan ?? '')
      setSubStatus((org.subscriptionStatus as typeof subStatus) ?? 'active')
    }
  }, [org])

  const handleImpersonate = async () => {
    if (!orgId) return
    setImpersonating(true)
    try {
      await enterImpersonation(orgId) // sets cookie server-side + redirects to /
    } catch {
      toast.error('Impersonation failed')
      setImpersonating(false)
    }
  }

  const handleSuspend = async () => {
    if (!org) return
    setSuspending(true)
    try {
      const isSuspended = org.status === 'suspended'
      const endpoint = isSuspended ? `/admin/orgs/${orgId}/unsuspend` : `/admin/orgs/${orgId}/suspend`
      await api.post(endpoint)
      setOrg((prev) => prev ? { ...prev, status: isSuspended ? 'active' : 'suspended' } : prev)
      toast.success(isSuspended ? 'Organization reactivated' : 'Organization suspended')
      onRefresh()
    } catch {
      toast.error('Failed to update org status')
    } finally {
      setSuspending(false)
    }
  }

  const handleSaveSub = async () => {
    if (!planSlug) { toast.error('Select a plan'); return }
    setSavingSub(true)
    try {
      await api.post(`/admin/orgs/${orgId}/subscription`, { planSlug, status: subStatus })
      toast.success('Subscription updated')
      onRefresh()
    } catch {
      toast.error('Failed to update subscription')
    } finally {
      setSavingSub(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-1 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-fg/10">
        <div className="flex items-center justify-between p-5 border-b border-fg/8">
          <h2 className="font-semibold text-fg text-base">{loading ? 'Loading…' : org?.name}</h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg p-1 rounded-lg hover:bg-fg/8">
            <X size={16} />
          </button>
        </div>

        {loading && <div className="p-8 text-center text-fg-muted text-sm">Loading…</div>}

        {!loading && org && (
          <div className="p-5 space-y-5">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-fg-muted">Slug:</span> <span className="text-fg font-mono">{org.slug}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-fg-muted">Plan:</span> <PlanBadge plan={org.plan} />
                <OrgStatusBadge status={org.status} />
              </div>
              <div><span className="text-fg-muted">Sub status:</span> <StatusBadge status={org.subscriptionStatus} /></div>
              <div><span className="text-fg-muted">Members:</span> <span className="text-fg">{org.userCount}</span></div>
              <div><span className="text-fg-muted">Contacts:</span> <span className="text-fg">{org.contactCount}</span></div>
              <div><span className="text-fg-muted">Deals:</span> <span className="text-fg">{org.dealCount}</span></div>
              <div><span className="text-fg-muted">Created:</span> <span className="text-fg">{formatDateShort(org.createdAt)}</span></div>
              {org.billingEmail && <div className="col-span-2"><span className="text-fg-muted">Billing email:</span> <span className="text-fg">{org.billingEmail}</span></div>}
            </div>

            {/* Subscription management */}
            <div className="border border-fg/8 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-widest">Subscription</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  label="Plan slug"
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                  placeholder="free / pro / enterprise"
                  className="w-40"
                />
                <Select
                  label="Status"
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as typeof subStatus)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'trialing', label: 'Trialing' },
                    { value: 'past_due', label: 'Past Due' },
                    { value: 'canceled', label: 'Canceled' },
                    { value: 'expired', label: 'Expired' },
                  ]}
                  className="w-36"
                />
              </div>
              <Button size="sm" onClick={handleSaveSub} disabled={savingSub}>
                {savingSub ? 'Saving…' : 'Save subscription'}
              </Button>
            </div>

            {/* Impersonate + Suspend */}
            <div className="border border-fg/8 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-widest">Acceso al CRM</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleImpersonate}
                  disabled={impersonating || org.status === 'suspended'}
                  leftIcon={<LogIn size={13} />}
                >
                  {impersonating ? 'Entrando…' : 'Entrar en este CRM'}
                </Button>
                <Button
                  size="sm"
                  variant={org.status === 'suspended' ? 'ghost' : 'ghost'}
                  onClick={handleSuspend}
                  disabled={suspending}
                  leftIcon={org.status === 'suspended' ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                  className={org.status === 'suspended' ? 'text-success hover:text-success' : 'text-danger hover:text-danger'}
                >
                  {suspending ? '…' : org.status === 'suspended' ? 'Reactivate org' : 'Suspend org'}
                </Button>
              </div>
              <p className="text-2xs text-fg-muted">Impersonate: abre el CRM como admin. Expira en 1h. Suspend: bloquea acceso a todos los usuarios.</p>
            </div>

            {/* Members */}
            {org.members.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-widest mb-2">Members</p>
                <div className="space-y-1">
                  {org.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-fg/5">
                      <div className="w-6 h-6 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center text-2xs font-bold flex-shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-fg font-medium">{m.name}</span>
                        <span className="text-xs text-fg-muted ml-2">{m.email}</span>
                      </div>
                      <span className="text-2xs text-fg-subtle">{m.role}</span>
                      {!m.isActive && <span className="text-2xs text-danger">inactive</span>}
                      {m.isSuperAdmin && <Shield size={12} className="text-accent-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Plan Editor Modal ─────────────────────────────────────────────────────────

function PlanModal({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !plan
  const [name, setName] = useState(plan?.name ?? '')
  const [slug, setSlug] = useState(plan?.slug ?? '')
  const [priceMonthly, setPriceMonthly] = useState(String(plan?.priceMonthly ?? 0))
  const [priceYearly, setPriceYearly] = useState(String(plan?.priceYearly ?? 0))
  const [maxUsers, setMaxUsers] = useState(String(plan?.maxUsers ?? 5))
  const [maxContacts, setMaxContacts] = useState(String(plan?.maxContacts ?? 1000))
  const [maxDeals, setMaxDeals] = useState(String(plan?.maxDeals ?? 500))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || (!isNew && !plan)) { toast.error('Name required'); return }
    setSaving(true)
    try {
      if (isNew) {
        await api.post('/admin/plans', {
          name: name.trim(),
          slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
          priceMonthly: Number(priceMonthly),
          priceYearly: Number(priceYearly),
          maxUsers: Number(maxUsers),
          maxContacts: Number(maxContacts),
          maxDeals: Number(maxDeals),
        })
      } else {
        await api.patch(`/admin/plans/${plan!.id}`, {
          name: name.trim(),
          priceMonthly: Number(priceMonthly),
          priceYearly: Number(priceYearly),
          maxUsers: Number(maxUsers),
          maxContacts: Number(maxContacts),
          maxDeals: Number(maxDeals),
        })
      }
      toast.success(isNew ? 'Plan created' : 'Plan updated')
      onSaved()
    } catch {
      toast.error('Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-1 rounded-2xl w-full max-w-md shadow-2xl border border-fg/10">
        <div className="flex items-center justify-between p-5 border-b border-fg/8">
          <h2 className="font-semibold text-fg text-base">{isNew ? 'New plan' : `Edit: ${plan!.name}`}</h2>
          <button type="button" onClick={onClose} className="text-fg-subtle hover:text-fg p-1 rounded-lg hover:bg-fg/8">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" disabled={!isNew} />
            <Input label="Price/month (€)" type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} />
            <Input label="Price/year (€)" type="number" value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} />
            <Input label="Max users" type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
            <Input label="Max contacts" type="number" value={maxContacts} onChange={(e) => setMaxContacts(e.target.value)} />
            <Input label="Max deals" type="number" value={maxDeals} onChange={(e) => setMaxDeals(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function Admin() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const [tab, setTab] = useState<AdminTab>('overview')

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Orgs
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [orgsTotal, setOrgsTotal] = useState(0)
  const [orgsLoading, setOrgsLoading] = useState(false)
  const [orgSearch, setOrgSearch] = useState('')
  const [orgPlanFilter, setOrgPlanFilter] = useState('')
  const [orgOffset, setOrgOffset] = useState(0)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  // Users
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userOffset, setUserOffset] = useState(0)

  // Plans
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null | 'new'>('new' as never)
  const [showPlanModal, setShowPlanModal] = useState(false)

  // Audit
  const [impersonationLogs, setImpersonationLogs] = useState<ImpersonationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsOffset, setLogsOffset] = useState(0)
  const LOGS_LIMIT = 25

  const ORG_LIMIT = 25
  const USER_LIMIT = 25

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(() => {
    setStatsLoading(true)
    api.get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setStatsLoading(false))
  }, [])

  const fetchOrgs = useCallback((offset = 0) => {
    setOrgsLoading(true)
    const params = new URLSearchParams({ limit: String(ORG_LIMIT), offset: String(offset) })
    if (orgSearch) params.set('search', orgSearch)
    if (orgPlanFilter) params.set('plan', orgPlanFilter)
    api.get<{ data: AdminOrg[]; total: number }>(`/admin/orgs?${params}`)
      .then((res) => { setOrgs(res.data); setOrgsTotal(res.total); setOrgOffset(offset) })
      .catch(() => toast.error('Failed to load orgs'))
      .finally(() => setOrgsLoading(false))
  }, [orgSearch, orgPlanFilter])

  const fetchUsers = useCallback((offset = 0) => {
    setUsersLoading(true)
    const params = new URLSearchParams({ limit: String(USER_LIMIT), offset: String(offset) })
    if (userSearch) params.set('search', userSearch)
    api.get<{ data: AdminUser[]; total: number }>(`/admin/users?${params}`)
      .then((res) => { setAdminUsers(res.data); setUsersTotal(res.total); setUserOffset(offset) })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setUsersLoading(false))
  }, [userSearch])

  const fetchPlans = useCallback(() => {
    setPlansLoading(true)
    api.get<{ data: Plan[] }>('/admin/plans')
      .then((res) => setPlans(res.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setPlansLoading(false))
  }, [])

  const fetchLogs = useCallback((offset = 0) => {
    setLogsLoading(true)
    const params = new URLSearchParams({ limit: String(LOGS_LIMIT), offset: String(offset) })
    api.get<{ data: ImpersonationLog[]; total: number }>(`/admin/impersonation-logs?${params}`)
      .then((res) => { setImpersonationLogs(res.data); setLogsTotal(res.total); setLogsOffset(offset) })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLogsLoading(false))
  }, [])

  // Match the shared API client's base (lib/api.ts): default to '/api' (the
  // reverse-proxy path) when VITE_API_URL is unset — NOT '' which 404s.
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

  const handleExportOrgs = () => {
    const params = new URLSearchParams()
    if (orgSearch) params.set('search', orgSearch)
    if (orgPlanFilter) params.set('plan', orgPlanFilter)
    window.open(`${apiBase}/admin/orgs/export?${params}`, '_blank')
  }

  const handleExportUsers = () => {
    window.open(`${apiBase}/admin/users/export`, '_blank')
  }

  useEffect(() => {
    // Data-fetch on tab change. The store fetchers set loading/result state; this
    // is the standard data-fetching effect, not a render-sync cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on tab switch
    if (tab === 'overview') fetchStats()
    if (tab === 'orgs') fetchOrgs(0)
    if (tab === 'users') fetchUsers(0)
    if (tab === 'plans') fetchPlans()
    if (tab === 'audit') fetchLogs(0)
  }, [tab, fetchStats, fetchOrgs, fetchUsers, fetchPlans, fetchLogs])

  const handleToggleSuperAdmin = async (user: AdminUser) => {
    try {
      await api.patch(`/admin/users/${user.id}`, { isSuperAdmin: !user.isSuperAdmin })
      setAdminUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isSuperAdmin: !u.isSuperAdmin } : u))
      toast.success('Updated')
    } catch {
      toast.error('Failed to update user')
    }
  }

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await api.patch(`/admin/users/${user.id}`, { isActive: !user.isActive })
      setAdminUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      toast.success('Updated')
    } catch {
      toast.error('Failed to update user')
    }
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
    { id: 'orgs', label: 'Organizations', icon: <Building2 size={15} /> },
    { id: 'users', label: 'Users', icon: <Users size={15} /> },
    { id: 'plans', label: 'Plans', icon: <Package size={15} /> },
    { id: 'audit', label: 'Audit', icon: <ClipboardList size={15} /> },
  ]

  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="crm-page flex items-center justify-center min-h-[40vh]">
        <div className="text-center space-y-2">
          <Shield size={32} className="mx-auto text-fg-muted" />
          <p className="text-fg font-medium">Access restricted</p>
          <p className="text-sm text-fg-muted">Super admin only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="crm-page space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg flex items-center gap-2">
            <Crown size={20} className="text-accent-400" />
            Super Admin
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">Signed in as {currentUser.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-fg/8 -mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-accent-500 text-accent-400'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={13} />} onClick={fetchStats} disabled={statsLoading}>
              Refresh
            </Button>
          </div>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard icon={<Building2 size={18} className="text-accent-400" />} label="Organizations" value={stats.orgs} color="bg-accent-500/15" />
              <StatCard icon={<Users size={18} className="text-info" />} label="Active users" value={stats.users} color="bg-info/15" />
              <StatCard icon={<Users size={18} className="text-success" />} label="Contacts" value={stats.contacts} color="bg-success/15" />
              <StatCard icon={<KanbanSquare size={18} className="text-warning" />} label="Deals" value={stats.deals} color="bg-warning/15" />
              <StatCard icon={<Zap size={18} className="text-danger" />} label="Activities" value={stats.activities} color="bg-danger/15" />
            </div>
          ) : (
            <div className="text-center text-fg-muted py-8 text-sm">{statsLoading ? 'Loading…' : 'No data'}</div>
          )}
        </div>
      )}

      {/* Orgs */}
      {tab === 'orgs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrgs(0)}
                placeholder="Search orgs…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-surface-2 border border-fg/8 rounded-xl text-fg placeholder-fg-muted focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <Select
              value={orgPlanFilter}
              onChange={(e) => setOrgPlanFilter(e.target.value)}
              options={[
                { value: '', label: 'All plans' },
                { value: 'free', label: 'Free' },
                { value: 'pro', label: 'Pro' },
                { value: 'enterprise', label: 'Enterprise' },
              ]}
              className="w-36"
            />
            <Button size="sm" onClick={() => fetchOrgs(0)} disabled={orgsLoading}>
              Search
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Download size={13} />} onClick={handleExportOrgs}>
              Export CSV
            </Button>
          </div>

          <div className="crm-surface-section overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fg/8 text-fg-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Organization</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                  <th className="text-right px-4 py-3 font-medium">Contacts</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orgsLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-fg-muted">Loading…</td></tr>
                ) : orgs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-fg-muted">No organizations found</td></tr>
                ) : orgs.map((org) => (
                  <tr key={org.id} className="border-b border-fg/5 hover:bg-fg/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg flex items-center gap-1.5">
                        {org.name}
                        <OrgStatusBadge status={org.status} />
                      </div>
                      <div className="text-xs text-fg-muted font-mono">{org.slug}</div>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={org.plan} /></td>
                    <td className="px-4 py-3"><StatusBadge status={org.subscriptionStatus} /></td>
                    <td className="px-4 py-3 text-right text-fg-muted">{Number(org.userCount)}</td>
                    <td className="px-4 py-3 text-right text-fg-muted">{Number(org.contactCount)}</td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{formatDateShort(org.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOrgId(org.id)}
                        className="text-xs text-accent-400 hover:text-accent-300 font-medium flex items-center gap-1"
                      >
                        Details <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orgsTotal > ORG_LIMIT && (
            <div className="flex items-center justify-between text-sm text-fg-muted">
              <span>{orgOffset + 1}–{Math.min(orgOffset + ORG_LIMIT, orgsTotal)} of {orgsTotal}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={orgOffset === 0} onClick={() => fetchOrgs(orgOffset - ORG_LIMIT)}>
                  Prev
                </Button>
                <Button size="sm" variant="ghost" disabled={orgOffset + ORG_LIMIT >= orgsTotal} onClick={() => fetchOrgs(orgOffset + ORG_LIMIT)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers(0)}
                placeholder="Search users…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-surface-2 border border-fg/8 rounded-xl text-fg placeholder-fg-muted focus:outline-none focus:border-accent-500/50"
              />
            </div>
            <Button size="sm" onClick={() => fetchUsers(0)} disabled={usersLoading}>Search</Button>
            <Button size="sm" variant="ghost" leftIcon={<Download size={13} />} onClick={handleExportUsers}>
              Export CSV
            </Button>
          </div>

          <div className="crm-surface-section overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fg/8 text-fg-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Organization</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Super admin</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-fg-muted">Loading…</td></tr>
                ) : adminUsers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-fg-muted">No users found</td></tr>
                ) : adminUsers.map((user) => (
                  <tr key={user.id} className="border-b border-fg/5 hover:bg-fg/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{user.name}</div>
                      <div className="text-xs text-fg-muted">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{user.role}</td>
                    <td className="px-4 py-3 text-fg-muted">{user.orgName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs font-medium flex items-center gap-1 ${user.isActive ? 'text-success' : 'text-danger'}`}
                        title={user.isActive ? 'Click to deactivate' : 'Click to reactivate'}
                      >
                        {user.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleSuperAdmin(user)}
                        className={`text-xs font-medium flex items-center gap-1 ${user.isSuperAdmin ? 'text-accent-400' : 'text-fg-muted'}`}
                        title="Toggle super admin"
                      >
                        {user.isSuperAdmin ? <Shield size={13} /> : <ChevronDown size={13} />}
                        {user.isSuperAdmin ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{formatDateShort(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {usersTotal > USER_LIMIT && (
            <div className="flex items-center justify-between text-sm text-fg-muted">
              <span>{userOffset + 1}–{Math.min(userOffset + USER_LIMIT, usersTotal)} of {usersTotal}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={userOffset === 0} onClick={() => fetchUsers(userOffset - USER_LIMIT)}>Prev</Button>
                <Button size="sm" variant="ghost" disabled={userOffset + USER_LIMIT >= usersTotal} onClick={() => fetchUsers(userOffset + USER_LIMIT)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-fg-muted">{plans.length} plans</p>
            <Button
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={() => { setEditingPlan(null); setShowPlanModal(true) }}
            >
              New plan
            </Button>
          </div>

          <div className="crm-surface-section overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fg/8 text-fg-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-right px-4 py-3 font-medium">Monthly</th>
                  <th className="text-right px-4 py-3 font-medium">Yearly</th>
                  <th className="text-right px-4 py-3 font-medium">Max users</th>
                  <th className="text-right px-4 py-3 font-medium">Max contacts</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {plansLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-fg-muted">Loading…</td></tr>
                ) : plans.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-fg-muted">No plans yet</td></tr>
                ) : plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-fg/5 hover:bg-fg/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{plan.name}</div>
                      <div className="text-xs text-fg-muted font-mono">{plan.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-fg">{plan.priceMonthly}€</td>
                    <td className="px-4 py-3 text-right text-fg">{plan.priceYearly}€</td>
                    <td className="px-4 py-3 text-right text-fg-muted">{plan.maxUsers}</td>
                    <td className="px-4 py-3 text-right text-fg-muted">{plan.maxContacts.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${plan.isActive ? 'text-success' : 'text-fg-muted'}`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setEditingPlan(plan); setShowPlanModal(true) }}
                        className="text-xs text-fg-muted hover:text-fg flex items-center gap-1"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-muted">Impersonation audit log</p>
            <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={13} />} onClick={() => fetchLogs(0)} disabled={logsLoading}>
              Refresh
            </Button>
          </div>

          <div className="crm-surface-section overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fg/8 text-fg-muted text-xs">
                  <th className="text-left px-4 py-3 font-medium">Super admin</th>
                  <th className="text-left px-4 py-3 font-medium">Target org</th>
                  <th className="text-left px-4 py-3 font-medium">Target user</th>
                  <th className="text-left px-4 py-3 font-medium">Started</th>
                  <th className="text-left px-4 py-3 font-medium">Ended</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-fg-muted">Loading…</td></tr>
                ) : impersonationLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-fg-muted">No impersonation logs</td></tr>
                ) : impersonationLogs.map((log) => (
                  <tr key={log.id} className="border-b border-fg/5 hover:bg-fg/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{log.superAdminName}</div>
                      <div className="text-xs text-fg-muted">{log.superAdminEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{log.targetOrgName}</td>
                    <td className="px-4 py-3">
                      <div className="text-fg">{log.targetUserName}</div>
                      <div className="text-xs text-fg-muted">{log.targetUserEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{formatDateShort(log.impersonatedAt)}</td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{log.endedAt ? formatDateShort(log.endedAt) : <span className="text-info">active</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logsTotal > LOGS_LIMIT && (
            <div className="flex items-center justify-between text-sm text-fg-muted">
              <span>{logsOffset + 1}–{Math.min(logsOffset + LOGS_LIMIT, logsTotal)} of {logsTotal}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={logsOffset === 0} onClick={() => fetchLogs(logsOffset - LOGS_LIMIT)}>Prev</Button>
                <Button size="sm" variant="ghost" disabled={logsOffset + LOGS_LIMIT >= logsTotal} onClick={() => fetchLogs(logsOffset + LOGS_LIMIT)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedOrgId && (
        <OrgDetailModal
          orgId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onRefresh={() => fetchOrgs(orgOffset)}
        />
      )}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan === 'new' ? null : editingPlan}
          onClose={() => setShowPlanModal(false)}
          onSaved={() => { setShowPlanModal(false); fetchPlans() }}
        />
      )}
    </div>
  )
}
