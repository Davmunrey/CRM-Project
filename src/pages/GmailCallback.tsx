import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { useGmailToken } from '../contexts/GmailTokenContext'
import { useEmailStore } from '../store/emailStore'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toastStore'
import { getGmailRedirectUri } from '../services/gmailService'
import { useTranslations } from '../i18n'
import { GOOGLE_OAUTH_MESSAGE_SOURCE, type GoogleOAuthMessagePayload } from '../services/googleIntegrationService'

function postToOpener(payload: GoogleOAuthMessagePayload) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { source: GOOGLE_OAUTH_MESSAGE_SOURCE, payload },
        window.location.origin,
      )
    }
  } catch {
    // ignore
  }
  window.setTimeout(() => window.close(), 400)
}

export function GmailCallback() {
  const t = useTranslations()
  const navigate = useNavigate()
  const { setGmailToken } = useGmailToken()
  const setGmailAddress = useEmailStore((s) => s.setGmailAddress)
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    async function exchange() {
      const params = new URLSearchParams(window.location.search)
      const oauthError = params.get('error')
      const code = params.get('code')
      const returnedState = params.get('state')
      const redirectUri = getGmailRedirectUri()

      if (oauthError) {
        const errPayload: GoogleOAuthMessagePayload = {
          ok: false,
          error: oauthError,
        }
        if (window.opener) {
          postToOpener(errPayload)
          return
        }
        toast.error(t.errors.googleOAuthAccessDenied)
        navigate('/settings/integrations', { replace: true })
        return
      }

      if (!code) {
        if (window.opener) {
          postToOpener({ ok: false, error: 'missing_code' })
          return
        }
        toast.error(t.errors.gmailConnectionError)
        navigate('/inbox', { replace: true })
        return
      }

      const legacyVerifier = sessionStorage.getItem('gmail_oauth_verifier')
      const storedLegacyState = sessionStorage.getItem('gmail_oauth_state')
      const isLegacy =
        Boolean(legacyVerifier && storedLegacyState && returnedState && returnedState === storedLegacyState)

      if (isLegacy) {
        sessionStorage.removeItem('gmail_oauth_state')
        sessionStorage.removeItem('gmail_oauth_verifier')
      }

      const body = isLegacy
        ? { code, code_verifier: legacyVerifier!, redirect_uri: redirectUri }
        : { code, state: returnedState, redirect_uri: redirectUri }

      if (!isLegacy && !returnedState) {
        if (window.opener) {
          postToOpener({ ok: false, error: 'missing_state' })
          return
        }
        toast.error(t.errors.googleOAuthStateInvalid)
        navigate('/settings/integrations', { replace: true })
        return
      }

      try {
        const { data, error } = await supabase!.functions.invoke('gmail-oauth-exchange', { body })

        const errMsg =
          error
            ? (error as { message?: string }).message
            : typeof (data as { error?: string } | null)?.error === 'string'
              ? (data as { error: string }).error
              : null

        if (errMsg || !data || typeof (data as { access_token?: string }).access_token !== 'string') {
          const raw = errMsg ?? (data as { error?: string })?.error
          if (window.opener) {
            postToOpener({ ok: false, error: raw ?? 'exchange_failed' })
            return
          }
          toast.error(typeof raw === 'string' && raw.length < 200 ? raw : t.errors.gmailConnectionError)
          navigate('/settings/integrations', { replace: true })
          return
        }

        const d = data as { access_token: string; expires_in?: number; email_address?: string }
        const expiresAt = Date.now() + (d.expires_in ?? 3600) * 1000
        setGmailToken(d.access_token, expiresAt)
        if (d.email_address) {
          setGmailAddress(d.email_address)
        }

        if (window.opener) {
          postToOpener({ ok: true, email: d.email_address })
          return
        }

        toast.success(t.settings.gmailConnectionActive)
        navigate('/inbox', { replace: true })
      } catch {
        if (window.opener) {
          postToOpener({ ok: false, error: 'network' })
          return
        }
        toast.error(t.errors.gmailConnectionError)
        navigate('/settings/integrations', { replace: true })
      }
    }

    void exchange()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-page-bg min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={40} className="text-accent-400" label={t.common.loading} />
        <p className="text-fg-muted text-sm font-medium">{t.common.loading}</p>
      </div>
    </div>
  )
}
