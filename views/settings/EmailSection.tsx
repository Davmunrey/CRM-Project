import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Wifi, WifiOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useTranslations } from '../../i18n'
import { useEmailStore } from '../../store/emailStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { disconnectGoogleIntegration } from '../../services/googleIntegrationService'
import { SettingsSmtpPanel } from '../../components/settings/SettingsSmtpPanel'
import { SignatureRichEditor } from '../../components/settings/SignatureRichEditor'

const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

interface EmailSectionProps {
  formatAgo: (iso?: string | null) => string
}

export function EmailSection({ formatAgo }: EmailSectionProps) {
  const t = useTranslations()
  const { isGmailConnected, gmailAddress, disconnectGmail, syncState, threadsLastSyncedAt, lastSyncErrorMessage } = useEmailStore()
  const { settings, updateEmailIdentity } = useSettingsStore()
  const currentUser = useAuthStore((s) => s.currentUser)

  const connected = isGmailConnected()
  const currentIdentity = currentUser?.id ? settings.emailIdentities?.[currentUser.id] : undefined
  const currentSignatures = currentIdentity?.signatures ?? []
  const currentDefaultSignatureId = currentIdentity?.defaultSignatureId ?? currentSignatures[0]?.id

  const [disconnectingGmail, setDisconnectingGmail] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [signatureHtml, setSignatureHtml] = useState('')
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(null)

  const handleDisconnectGmail = async () => {
    setDisconnectingGmail(true)
    try {
      await disconnectGoogleIntegration()
      disconnectGmail()
      toast.success(t.settings.gmailDisconnected)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.gmailConnectionError)
    } finally {
      setDisconnectingGmail(false)
    }
  }

  const handleSaveSignature = () => {
    if (!currentUser?.id) {
      toast.error(t.errors.generic)
      return
    }
    const sigId = useSettingsStore.getState().upsertEmailSignature(currentUser.id, {
      id: editingSignatureId ?? undefined,
      name: signatureName.trim() || 'Signature',
      html: signatureHtml.trim(),
    })
    if (!currentDefaultSignatureId) {
      useSettingsStore.getState().setDefaultEmailSignature(currentUser.id, sigId)
    }
    setSignatureName('')
    setSignatureHtml('')
    setEditingSignatureId(null)
    toast.success(t.settings.signatureSaved)
  }

  return (
    <>
      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t.settings.emailProviderHealth}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailSyncState}</p>
            <p className="text-sm text-fg">{syncState}</p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailLastSync}</p>
            <p className="text-sm text-fg">{threadsLastSyncedAt ? formatAgo(threadsLastSyncedAt) : t.settings.leadOpsNotAvailable}</p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.emailLastError}</p>
            <p className="text-sm text-fg">{lastSyncErrorMessage ?? t.settings.leadOpsNotAvailable}</p>
          </div>
        </div>
      </section>

      <section className="crm-surface-section p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-danger/20 flex items-center justify-center">
            <Mail size={14} className="text-danger" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t.settings.gmailIntegration}</h2>
            <p className="text-xs text-fg-subtle">{t.email.gmailApiLabel}</p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-success" />
                <div>
                  <p className="text-sm font-medium text-fg">{gmailAddress ?? t.settings.gmailConnected}</p>
                  <p className="text-xs text-success">{t.settings.gmailConnectionActive}</p>
                </div>
              </div>
              <Button variant="danger" size="sm" loading={disconnectingGmail} leftIcon={disconnectingGmail ? undefined : <WifiOff size={12} />} onClick={handleDisconnectGmail}>
                {t.settings.disconnect}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg">
            <p className="text-sm text-fg">{t.settings.gmailConnectViaIntegrations}</p>
            <Link
              to="/settings/integrations"
              className="inline-flex items-center justify-center gap-1.5 btn-gradient text-fg font-semibold px-3.5 py-1.5 text-sm rounded-full min-h-control"
            >
              <Mail size={14} className="shrink-0" aria-hidden />
              {t.settings.gmailOpenIntegrations}
            </Link>
          </div>
        )}
      </section>

      <section className="crm-surface-section p-6">
        <SettingsSmtpPanel />
      </section>

      <section className="crm-surface-section p-6">
        <h2 className="text-base font-semibold text-fg mb-3">{t.settings.emailSignatures}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="space-y-2 max-w-xl">
              <Select
                label={t.settings.composerSignatureDefaultLabel}
                value={currentIdentity?.composerSignatureDefault ?? 'include_default'}
                onChange={(e) => {
                  if (!currentUser?.id) return
                  const v = e.target.value === 'none_by_default' ? 'none_by_default' : 'include_default'
                  updateEmailIdentity(currentUser.id, { composerSignatureDefault: v })
                }}
                options={[
                  { value: 'include_default', label: t.settings.composerSignatureDefaultAutomatic },
                  { value: 'none_by_default', label: t.settings.composerSignatureDefaultManual },
                ]}
                disabled={!currentUser?.id}
              />
              <p className="text-[11px] text-fg-subtle leading-relaxed">{t.settings.composerSignatureDefaultHelp}</p>
            </div>
            <Input
              label={t.settings.signatureName}
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder={t.settings.signatureNamePlaceholder}
            />
            <SignatureRichEditor
              id="settings-email-signature"
              label={t.settings.signatureHtml}
              placeholder={t.settings.placeholderEmailSignatureHtml}
              value={signatureHtml}
              onChange={setSignatureHtml}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveSignature}>{editingSignatureId ? t.common.save : t.common.create}</Button>
              {editingSignatureId && <Button size="sm" variant="ghost" onClick={() => { setEditingSignatureId(null); setSignatureName(''); setSignatureHtml('') }}>{t.common.cancel}</Button>}
            </div>
          </div>
          <div className="space-y-2">
            {currentSignatures.length === 0 && (
              <p className="text-xs text-fg-subtle">{t.common.noResults}</p>
            )}
            {currentSignatures.map((sig) => (
              <div key={sig.id} className={`${innerSurface} p-3`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-fg font-medium">{sig.name}</div>
                  {sig.id === currentDefaultSignatureId ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 border border-accent-500/30 text-accent-300">{t.settings.signatureDefault}</span>
                  ) : (
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      onClick={() => currentUser?.id && useSettingsStore.getState().setDefaultEmailSignature(currentUser.id, sig.id)}
                    >
                      {t.settings.signatureSetDefault}
                    </Button>
                  )}
                </div>
                <div className="text-xs text-fg-muted mb-2 line-clamp-2">{sig.html.replace(/<[^>]+>/g, ' ')}</div>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => { setEditingSignatureId(sig.id); setSignatureName(sig.name); setSignatureHtml(sig.html) }}>{t.common.edit}</Button>
                  <Button size="xs" variant="ghost" onClick={() => {
                    if (!currentUser?.id) return
                    useSettingsStore.getState().deleteEmailSignature(currentUser.id, sig.id)
                    toast.success(t.settings.signatureDeleted)
                  }}>{t.common.delete}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
