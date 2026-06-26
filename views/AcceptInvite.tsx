import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { UserPlus, CheckCircle, XCircle } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { useTranslations } from '../i18n'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/auth'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { api } from '../lib/api'

interface InvitationDetails {
  id: string
  email: string
  role: string
  orgName: string
  orgId: string
  expiresAt: string
}

interface AcceptResponse {
  organizationId: string
  role: string
  expiresAt: number
}

type PageState = 'loading' | 'ready' | 'joining' | 'success' | 'error'

export function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const t = useTranslations()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>(() => token ? 'loading' : 'error')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(() => token ? null : t.invitations.invalidToken)

  useEffect(() => {
    if (!token) return

    api.get<InvitationDetails>(`/invitations/${encodeURIComponent(token)}`)
      .then((inv) => {
        setInvitation(inv)
        setPageState('ready')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : t.invitations.invalidOrExpired
        if (msg === 'Invitation already accepted') {
          setErrorMsg(t.invitations.alreadyAccepted)
        } else if (msg === 'Invitation has expired') {
          setErrorMsg(t.invitations.expired)
        } else {
          setErrorMsg(t.invitations.invalidOrExpired)
        }
        setPageState('error')
      })
  }, [token, t])

  const handleAccept = async () => {
    if (!invitation || !token) return

    const currentUser = useAuthStore.getState().currentUser
    if (!currentUser) {
      navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }

    setPageState('joining')
    try {
      const res = await api.post<AcceptResponse>(`/invitations/${encodeURIComponent(token)}/accept`, {})
      // Cookie is set by server — just update local auth state

      const cur = useAuthStore.getState().currentUser
      if (cur) {
        useAuthStore.getState().setCurrentUser({
          ...cur,
          organizationId: res.organizationId,
          role: res.role as UserRole,
        })
        useAuthStore.setState({
          organizationId: res.organizationId,
          tenantResolutionStatus: 'ready',
          tenantResolutionMessage: null,
        })
        void useAuthStore.getState().fetchOrgUsers(res.organizationId).catch(() => { /* non-critical */ })
      }

      setPageState('success')
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPageState('error')
    }
  }

  const orgName = invitation?.orgName ?? t.acceptInvite.organization

  const ROLE_LABELS: Record<string, string> = {
    admin: t.acceptInvite.roleAdmin,
    manager: t.acceptInvite.roleManager,
    sales_rep: t.acceptInvite.roleSalesRep,
    viewer: t.acceptInvite.roleViewer,
  }

  if (pageState === 'loading') {
    return (
      <AuthLayout variant="centered" showBrandingHeader={false}>
        <div className="flex justify-center py-12">
          <Spinner size={32} className="text-accent-400" label={t.common.loading} />
        </div>
      </AuthLayout>
    )
  }

  if (pageState === 'error') {
    return (
      <AuthLayout variant="centered" showBrandingHeader={false}>
        <div className="glass rounded-2xl border border-fg/10 p-8 text-center shadow-float">
          <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-danger" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-fg mb-2">{t.acceptInvite.invalidTitle}</h1>
          <p className="text-sm text-fg-subtle mb-6 leading-relaxed">{errorMsg}</p>
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl btn-gradient text-fg text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            {t.acceptInvite.loginCta}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (pageState === 'success') {
    return (
      <AuthLayout variant="centered" showBrandingHeader={false}>
        <div className="glass rounded-2xl border border-fg/10 p-8 text-center shadow-float">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-success" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-fg mb-2">{t.acceptInvite.welcomeTo} {orgName}!</h1>
          <p className="text-sm text-fg-subtle">{t.acceptInvite.redirecting}</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      variant="centered"
      logo={(
        <div className="w-14 h-14 rounded-2xl bg-accent-500/20 flex items-center justify-center mx-auto mb-4 border border-accent-500/25">
          <UserPlus size={28} className="text-accent-400" aria-hidden />
        </div>
      )}
      title={<h1 className="text-2xl font-bold text-fg text-center">{t.acceptInvite.joinOrg} {orgName}</h1>}
      subtitle={<p className="text-sm text-fg-subtle mt-1 text-center">{t.acceptInvite.invitedToTeam}</p>}
    >
      <div className="glass rounded-2xl border border-fg/10 p-5 mb-6 space-y-3 shadow-float">
        <div className="flex justify-between text-sm">
          <span className="text-fg-subtle">{t.acceptInvite.organization}</span>
          <span className="text-fg font-medium">{orgName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-fg-subtle">{t.auth.email}</span>
          <span className="text-fg">{invitation?.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-fg-subtle">{t.acceptInvite.assignedRole}</span>
          <span className="text-accent-400 font-medium">
            {ROLE_LABELS[invitation?.role ?? ''] ?? invitation?.role}
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => void handleAccept()}
        disabled={pageState === 'joining'}
        loading={pageState === 'joining'}
        leftIcon={<UserPlus size={18} aria-hidden />}
      >
        {t.acceptInvite.acceptCta}
      </Button>
    </AuthLayout>
  )
}
