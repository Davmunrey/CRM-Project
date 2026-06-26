import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useTranslations } from '../../i18n'
import { getUxActionCount, trackUxAction } from '../../lib/uxMetrics'
import { useAuthStore } from '../../store/authStore'
import { useOnboardingStore } from '../../store/onboardingStore'

const innerSurface = 'rounded-xl border border-border-subtle bg-surface-1'

export function OnboardingSection() {
  const t = useTranslations()
  const organizationId = useAuthStore((s) => s.organizationId)
  const onboardingGetFlags = useOnboardingStore((s) => s.getFlags)
  const onboardingSetStep = useOnboardingStore((s) => s.setStep)
  const onboardingResetOrg = useOnboardingStore((s) => s.resetOrg)
  const onboardingFlags = onboardingGetFlags(organizationId ?? undefined)

  const authLoginAttempts = getUxActionCount('auth_login_attempt')
  const authLoginSuccesses = getUxActionCount('auth_login_success')
  const orgSetupAttempts = getUxActionCount('onboarding_org_setup_submit_attempt')
  const orgSetupSuccesses = getUxActionCount('onboarding_org_setup_submit_success')
  const resetCompleteAttempts = getUxActionCount('auth_password_reset_complete_attempt')
  const resetCompleteSuccesses = getUxActionCount('auth_password_reset_complete_success')

  const pct = (ok: number, total: number) => (total > 0 ? Math.round((ok / total) * 100) : 0)
  const loginRate = pct(authLoginSuccesses, authLoginAttempts)
  const orgSetupRate = pct(orgSetupSuccesses, orgSetupAttempts)
  const resetRate = pct(resetCompleteSuccesses, resetCompleteAttempts)

  const activationInputs = [authLoginAttempts, orgSetupAttempts, resetCompleteAttempts]
  const activationCompletions = [authLoginSuccesses, orgSetupSuccesses, resetCompleteSuccesses]
  const totalAttempts = activationInputs.reduce((sum, item) => sum + item, 0)
  const totalSuccesses = activationCompletions.reduce((sum, item) => sum + item, 0)
  const activationHealth = pct(totalSuccesses, totalAttempts)

  return (
    <section className="crm-surface-section p-6">
      <h2 className="text-base font-semibold text-fg mb-1">{t.settings.onboardingTitle}</h2>
      <p className="text-xs text-fg-subtle mb-4">{t.settings.onboardingIntro}</p>
      <ul className="space-y-4">
        <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
          <div>
            <p className="text-sm font-medium text-fg">{t.settings.onboardingStepImport}</p>
            <Link to="/contacts" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
              {t.settings.onboardingGoContacts}
            </Link>
          </div>
          <Button
            type="button"
            size="sm"
            variant={onboardingFlags.importContacts ? 'secondary' : 'primary'}
            onClick={() => {
              const next = !onboardingFlags.importContacts
              onboardingSetStep(organizationId ?? undefined, 'importContacts', next)
              trackUxAction('onboarding_checklist_toggle', { step: 'importContacts', done: next })
            }}
          >
            {onboardingFlags.importContacts ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
          </Button>
        </li>
        <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
          <div>
            <p className="text-sm font-medium text-fg">{t.settings.onboardingStepDeal}</p>
            <Link to="/deals" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
              {t.settings.onboardingGoDeals}
            </Link>
          </div>
          <Button
            type="button"
            size="sm"
            variant={onboardingFlags.firstDeal ? 'secondary' : 'primary'}
            onClick={() => {
              const next = !onboardingFlags.firstDeal
              onboardingSetStep(organizationId ?? undefined, 'firstDeal', next)
              trackUxAction('onboarding_checklist_toggle', { step: 'firstDeal', done: next })
            }}
          >
            {onboardingFlags.firstDeal ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
          </Button>
        </li>
        <li className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${innerSurface}`}>
          <div>
            <p className="text-sm font-medium text-fg">{t.settings.onboardingStepSequence}</p>
            <Link to="/sequences" className="text-xs text-accent-400 hover:underline mt-1 inline-block">
              {t.settings.onboardingGoSequences}
            </Link>
          </div>
          <Button
            type="button"
            size="sm"
            variant={onboardingFlags.firstSequence ? 'secondary' : 'primary'}
            onClick={() => {
              const next = !onboardingFlags.firstSequence
              onboardingSetStep(organizationId ?? undefined, 'firstSequence', next)
              trackUxAction('onboarding_checklist_toggle', { step: 'firstSequence', done: next })
            }}
          >
            {onboardingFlags.firstSequence ? t.settings.onboardingMarkTodo : t.settings.onboardingMarkDone}
          </Button>
        </li>
      </ul>
      <div className="mt-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            onboardingResetOrg(organizationId ?? undefined)
            trackUxAction('onboarding_checklist_reset', {})
          }}
        >
          {t.settings.onboardingReset}
        </Button>
      </div>
      <div className={`mt-5 p-4 ${innerSurface}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-fg">{t.settings.activationFunnelTitle}</p>
            <p className="text-xs text-fg-subtle">{t.settings.activationFunnelSubtitle}</p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              activationHealth >= 80
                ? 'bg-success/15 text-success border-success/30'
                : activationHealth >= 60
                  ? 'bg-warning/15 text-warning border-warning/30'
                  : 'bg-danger/15 text-danger border-danger/30'
            }`}
          >
            {t.settings.activationHealthLabel}: {activationHealth}%
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.activationLoginLabel}</p>
            <p className="text-sm text-fg">
              {authLoginSuccesses}/{authLoginAttempts} - {loginRate}%
            </p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.activationOrgSetupLabel}</p>
            <p className="text-sm text-fg">
              {orgSetupSuccesses}/{orgSetupAttempts} - {orgSetupRate}%
            </p>
          </div>
          <div className={`${innerSurface} p-3`}>
            <p className="text-xs text-fg-subtle mb-1">{t.settings.activationResetLabel}</p>
            <p className="text-sm text-fg">
              {resetCompleteSuccesses}/{resetCompleteAttempts} - {resetRate}%
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-fg-subtle">{t.settings.activationFunnelHint}</p>
      </div>
    </section>
  )
}
