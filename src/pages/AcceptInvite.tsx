import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { UserPlus, CheckCircle, XCircle } from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useTranslations } from '../i18n'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'

interface InvitationRow {
  id: string
  organization_id: string
  email: string
  role: string
  status: string
  expires_at: string
  organizations: { name: string } | null
}

type PageState = 'loading' | 'ready' | 'joining' | 'success' | 'error'

export function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const t = useTranslations()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationRow | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setErrorMsg(t.invitations.invalidToken)
      setPageState('error')
      return
    }
    if (!supabase) {
      setErrorMsg(t.errors.supabaseNotConfigured)
      setPageState('error')
      return
    }

    const fetchInvitation = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase! as any)
        .from('invitations')
        .select('*, organizations(name)')
        .eq('token', token)
        .single()

      if (error || !data) {
        setErrorMsg(t.invitations.invalidOrExpired)
        setPageState('error')
        return
      }

      const inv = data as InvitationRow

      if (inv.status !== 'pending') {
        setErrorMsg(
          inv.status === 'accepted'
            ? t.invitations.alreadyAccepted
            : t.invitations.expired
        )
        setPageState('error')
        return
      }

      if (new Date(inv.expires_at) < new Date()) {
        setErrorMsg(t.invitations.expired)
        setPageState('error')
        return
      }

      setInvitation(inv)
      setPageState('ready')
    }

    void fetchInvitation()
  }, [token, t])

  const handleAccept = async () => {
    if (!invitation || !supabase) return

    setPageState('joining')

    try {
      const { data: { user }, error: userErr } = await supabase!.auth.getUser()

      if (userErr || !user) {
        navigate(`/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: memberErr } = await (supabase! as any)
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
        })

      if (memberErr) throw new Error(memberErr.message)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase! as any)
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      const { error: refreshErr } = await supabase!.auth.refreshSession()
      if (refreshErr) throw new Error(refreshErr.message)

      setPageState('success')
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPageState('error')
    }
  }

  const orgName = invitation?.organizations?.name ?? t.acceptInvite.organization

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
            className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl btn-gradient text-fg text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
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
        onClick={handleAccept}
        disabled={pageState === 'joining'}
        loading={pageState === 'joining'}
        leftIcon={<UserPlus size={18} aria-hidden />}
      >
        {t.acceptInvite.acceptCta}
      </Button>
    </AuthLayout>
  )
}
