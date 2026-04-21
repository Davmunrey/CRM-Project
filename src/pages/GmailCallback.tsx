import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { useGmailToken } from '../contexts/GmailTokenContext'
import { useEmailStore } from '../store/emailStore'
import { supabase } from '../lib/supabase'
import { toast } from '../store/toastStore'
import { getGmailRedirectUri } from '../services/gmailService'
import { useTranslations } from '../i18n'

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
      const code = params.get('code')
      const returnedState = params.get('state')

      // CSRF check: state must match what we stored before the redirect
      const storedState = sessionStorage.getItem('gmail_oauth_state')
      const codeVerifier = sessionStorage.getItem('gmail_oauth_verifier')

      if (!code || !returnedState || !storedState || !codeVerifier) {
        toast.error(t.errors.gmailConnectionError)
        navigate('/inbox', { replace: true })
        return
      }

      if (returnedState !== storedState) {
        toast.error(t.errors.gmailConnectionError)
        navigate('/inbox', { replace: true })
        return
      }

      // Clear sessionStorage - verifier + state are single-use
      sessionStorage.removeItem('gmail_oauth_state')
      sessionStorage.removeItem('gmail_oauth_verifier')

      try {
        const { data, error } = await supabase!.functions.invoke('gmail-oauth-exchange', {
          body: { code, code_verifier: codeVerifier, redirect_uri: getGmailRedirectUri() },
        })

        if (error || !data?.access_token) {
          toast.error(t.errors.gmailConnectionError)
          navigate('/inbox', { replace: true })
          return
        }

        // Store access token in memory only (per D-08)
        const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000
        setGmailToken(data.access_token, expiresAt)

        // Persist only the email address (per D-09)
        if (data.email_address) {
          setGmailAddress(data.email_address)
        }

        navigate('/inbox', { replace: true })
      } catch {
        toast.error(t.errors.gmailConnectionError)
        navigate('/inbox', { replace: true })
      }
    }

    exchange()
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
