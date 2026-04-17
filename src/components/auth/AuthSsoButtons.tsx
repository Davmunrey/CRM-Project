import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { useTranslations } from '../../i18n'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { authProviderConfig, resolveGoogleOAuthPolicy, resolveSamlDomain } from '../../config/authProviders'

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z" />
      <path fill="#34A853" d="M2 12c0 2.1.8 4 2.1 5.5l3.4-2.6c-.9-.7-1.5-1.8-1.5-2.9s.6-2.2 1.5-2.9L4.1 6.5C2.8 8 2 9.9 2 12z" />
      <path fill="#FBBC05" d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.7-5.3-4L3.2 17c1.7 3.3 5.1 5 8.8 5z" />
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.2-.2-1.8H12v3.9h5.5c-.3 1.4-1.1 2.4-2.2 3.1l3.1 2.4c1.8-1.7 3.2-4.2 3.2-7.6z" />
    </svg>
  )
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M16.7 12.7c0-2.1 1.7-3.1 1.8-3.2-1-.1-2.5-1.1-3.9-1.1-1.6 0-2.4.8-3.3.8-.9 0-1.8-.8-3-.8-2.3 0-4.7 1.9-4.7 5.5 0 1.2.2 2.5.7 3.8.6 1.5 1.4 3.2 2.6 3.2.7 0 1.2-.5 2.1-.5.9 0 1.3.5 2.1.5 1.2 0 2-1.5 2.6-3 .4-1 .5-1.5.8-2.6-2-.8-2.8-2.4-2.8-3.6zm-3.3-6.6c.5-.6.9-1.4.8-2.2-.8.1-1.6.5-2.1 1.1-.5.5-.9 1.3-.8 2.1.8.1 1.5-.3 2.1-1z" />
    </svg>
  )
}

export interface AuthSsoButtonsProps {
  email: string
  onError: (message: string) => void
}

export function AuthSsoButtons({ email, onError }: AuthSsoButtonsProps) {
  const t = useTranslations()
  const [ssoDomain, setSsoDomain] = useState('')
  const [providerLoading, setProviderLoading] = useState<'google' | 'azure' | 'apple' | 'saml' | null>(null)

  if (!isSupabaseConfigured || !supabase) return null
  const sb = supabase

  const handleOAuthLogin = async (provider: 'google' | 'azure' | 'apple') => {
    setProviderLoading(provider)
    const options: {
      redirectTo: string
      queryParams?: Record<string, string>
    } = { redirectTo: `${window.location.origin}/` }

    if (provider === 'google') {
      try {
        const policy = await resolveGoogleOAuthPolicy(email)
        if (!policy.allowGoogleOAuth) {
          onError(
            policy.preferredProvider === 'saml'
              ? t.auth.googleSsoUseCompanySso
              : t.auth.googleSsoUnavailable,
          )
          setProviderLoading(null)
          return
        }

        const queryParams: Record<string, string> = { prompt: 'select_account' }
        if (policy.googleHostedDomain) queryParams.hd = policy.googleHostedDomain
        if (policy.loginHint) queryParams.login_hint = policy.loginHint
        options.queryParams = queryParams
      } catch (e) {
        onError((e as Error).message)
        setProviderLoading(null)
        return
      }
    }

    const { error: oauthError } = await sb.auth.signInWithOAuth({
      provider,
      options,
    })
    if (oauthError) onError(oauthError.message)
    setProviderLoading(null)
  }

  const handleSamlLogin = async () => {
    if (!ssoDomain.trim()) {
      onError(t.auth.companyDomainRequired)
      return
    }
    setProviderLoading('saml')
    let samlDomain = ''
    try {
      samlDomain = await resolveSamlDomain(ssoDomain)
    } catch (e) {
      onError((e as Error).message)
      setProviderLoading(null)
      return
    }
    const { error: ssoError } = await sb.auth.signInWithSSO({
      domain: samlDomain,
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (ssoError) onError(ssoError.message)
    setProviderLoading(null)
  }

  const hasAnyOAuth = authProviderConfig.google || authProviderConfig.azure || authProviderConfig.apple

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-fg/10" />
        <span className="text-[11px] uppercase tracking-wider text-fg-subtle">{t.auth.sso}</span>
        <div className="h-px flex-1 bg-fg/10" />
      </div>

      {hasAnyOAuth && (
        <div className="space-y-2">
          {authProviderConfig.google && (
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center rounded-xl"
              onClick={() => handleOAuthLogin('google')}
              disabled={providerLoading !== null}
              leftIcon={<GoogleLogo />}
            >
              {providerLoading === 'google' ? `${t.auth.connecting} Google...` : `${t.common.continue} Google`}
            </Button>
          )}
          {authProviderConfig.azure && (
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center rounded-xl"
              onClick={() => handleOAuthLogin('azure')}
              disabled={providerLoading !== null}
              leftIcon={<MicrosoftLogo />}
            >
              {providerLoading === 'azure' ? `${t.auth.connecting} Azure...` : `${t.common.continue} Azure`}
            </Button>
          )}
          {authProviderConfig.apple && (
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center rounded-xl"
              onClick={() => handleOAuthLogin('apple')}
              disabled={providerLoading !== null}
              leftIcon={<AppleLogo />}
            >
              {providerLoading === 'apple' ? `${t.auth.connecting} Apple...` : `${t.common.continue} Apple`}
            </Button>
          )}
        </div>
      )}

      {authProviderConfig.saml && (
        <Card variant="muted" className="mt-3 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted mb-2">{t.auth.saml}</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Input
              type="text"
              value={ssoDomain}
              onChange={(e) => setSsoDomain(e.target.value)}
              placeholder={t.auth.samlDomainPlaceholder}
              className="flex-1 min-w-0"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="sm:w-auto w-full whitespace-nowrap rounded-xl"
              onClick={handleSamlLogin}
              disabled={providerLoading !== null}
            >
              {providerLoading === 'saml' ? `${t.auth.connecting}...` : t.auth.useSaml}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-fg-muted">{t.auth.companyDomainRequired}</p>
        </Card>
      )}
    </>
  )
}
