import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from '../../i18n'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { toast } from '../../store/toastStore'
import { Shield } from 'lucide-react'

export function SettingsMfaPanel() {
  const t = useTranslations()
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) return
    const verified = data.totp.find((f) => f.status === 'verified')
    setTotpFactorId(verified?.id ?? null)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetches MFA factor status on mount; setState inside async `load` is the standard data-fetching pattern
    void load()
  }, [load])

  const startEnroll = async () => {
    if (!supabase) return
    setEnrolling(true)
    setCode('')
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: t.settings.mfaFactorName,
    })
    setEnrolling(false)
    if (error || !data) {
      toast.error(error?.message ?? 'MFA')
      return
    }
    setPendingFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  const confirmEnroll = async () => {
    if (!supabase || !pendingFactorId) return
    setVerifyLoading(true)
    const { data: chall, error: c0 } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId })
    if (c0 || !chall) {
      toast.error(c0?.message ?? 'challenge')
      setVerifyLoading(false)
      return
    }
    const { error: v0 } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: chall.id,
      code: code.replace(/\s/g, ''),
    })
    setVerifyLoading(false)
    if (v0) {
      toast.error(v0.message)
      return
    }
    toast.success(t.settings.mfaToastEnrolled)
    setQr(null)
    setSecret(null)
    setPendingFactorId(null)
    setCode('')
    void load()
  }

  const unenroll = async () => {
    if (!supabase || !totpFactorId) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactorId })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(t.settings.mfaToastUnenrolled)
    void load()
  }

  if (!isSupabaseConfigured || !supabase) {
    return <p className="text-sm text-fg-muted">{t.errors.supabaseNotConfiguredDetail}</p>
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center text-accent-400">
          <Shield size={16} aria-hidden />
        </span>
        <h2 className="text-base font-semibold text-fg">{t.settings.mfaTitle}</h2>
      </div>
      <p className="text-sm text-fg-muted">{t.settings.mfaDescription}</p>
      <p className="text-sm text-fg">{totpFactorId ? t.settings.mfaEnrolled : t.settings.mfaNotEnrolled}</p>

      {!totpFactorId && !qr && (
        <Button type="button" onClick={() => void startEnroll()} loading={enrolling}>
          {t.settings.mfaEnroll}
        </Button>
      )}

      {qr && (
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm text-fg">{t.settings.mfaScanQr}</p>
          <img src={qr} alt="" className="w-40 h-40 border border-border-subtle rounded-md bg-surface-0" />
          {secret ? (
            <p className="text-xs font-mono break-all text-fg-muted">
              {secret}
            </p>
          ) : null}
          <Input
            label={t.settings.mfaEnterCode}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void confirmEnroll()}
              loading={verifyLoading}
              disabled={code.replace(/\s/g, '').length < 6}
            >
              {t.settings.mfaConfirmEnroll}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQr(null)
                setSecret(null)
                setPendingFactorId(null)
                setCode('')
              }}
            >
              {t.common.cancel}
            </Button>
          </div>
        </div>
      )}

      {totpFactorId ? (
        <Button type="button" variant="secondary" onClick={() => void unenroll()}>
          {t.settings.mfaUnenroll}
        </Button>
      ) : null}
    </div>
  )
}
