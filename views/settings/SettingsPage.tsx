import { useSearchParams } from 'react-router-dom'
import { useTranslations } from '../../i18n'
import { PageHeader } from '../../components/ui/PageHeader'
import { Toolbar } from '../../components/ui/Toolbar'
import { Tabs } from '../../components/ui/Tabs'
import { SettingsWebhooksPanel } from '../../components/settings/SettingsWebhooksPanel'
import { SettingsIntegrationsPanel } from '../../components/settings/SettingsIntegrationsPanel'
import { SettingsMfaPanel } from '../../components/settings/SettingsMfaPanel'
import { SettingsSsoScimPanel } from '../../components/settings/SettingsSsoScimPanel'
import { SettingsPipelinesPanel } from '../../components/settings/SettingsPipelinesPanel'
import { OnboardingSection } from './OnboardingSection'
import { GeneralSection } from './GeneralSection'
import { EmailSection } from './EmailSection'
import { CustomFieldsSection } from './CustomFieldsSection'
import { BrandingSection } from './BrandingSection'
import { BillingSection } from './BillingSection'
import { PipelineSection } from './PipelineSection'
import { PermissionsSection } from './PermissionsSection'
import { DataSection } from './DataSection'
import { NavigationSection } from './NavigationSection'
import { AdvancedSection } from './AdvancedSection'

type SettingsTab =
  | 'general'
  | 'onboarding'
  | 'branding'
  | 'pipeline'
  | 'pipelines'
  | 'email'
  | 'permissions'
  | 'security'
  | 'data'
  | 'navigation'
  | 'webhooks'
  | 'integrations'
  | 'billing'
  | 'advanced'

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const t = useTranslations()

  const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: t.settings.tabGeneral },
    { id: 'onboarding', label: t.settings.tabOnboarding },
    { id: 'branding', label: t.settings.tabBranding },
    { id: 'pipeline', label: t.settings.tabPipeline },
    { id: 'pipelines', label: t.settings.tabPipelines },
    { id: 'email', label: t.settings.tabEmail },
    { id: 'permissions', label: t.settings.tabPermissions },
    { id: 'security', label: t.settings.tabSecurity },
    { id: 'data', label: t.settings.tabData },
    { id: 'navigation', label: t.settings.tabNavigation },
    { id: 'webhooks', label: t.settings.tabWebhooks },
    { id: 'integrations', label: t.settings.tabIntegrations },
    { id: 'billing', label: 'Billing' },
    { id: 'advanced', label: t.settings.tabAdvanced },
  ]

  const activeTab = (searchParams.get('tab') as SettingsTab | null) ?? 'general'
  const setActiveTab = (tab: SettingsTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const activeTabLabel = SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label ?? t.settings.title

  const formatAgo = (iso?: string | null) => {
    if (!iso) return t.settings.leadOpsNotAvailable
    const diffMs = Date.now() - new Date(iso).getTime()
    if (diffMs < 60_000) return t.settings.leadOpsJustNow
    const mins = Math.floor(diffMs / 60_000)
    if (mins < 60) return `${mins}${t.settings.leadOpsMinsAgo}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}${t.settings.leadOpsHoursAgo}`
    const days = Math.floor(hours / 24)
    return `${days}${t.settings.leadOpsDaysAgo}`
  }

  return (
    <div className="crm-page space-y-5">
      <PageHeader
        showTitle={false}
        title={t.nav.settings}
        subtitle={activeTabLabel}
      />
      <Toolbar panel>
        <Tabs
          tabs={SETTINGS_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as SettingsTab)}
          className="min-w-0"
        />
      </Toolbar>

      {activeTab === 'onboarding' && <OnboardingSection />}

      {activeTab === 'general' && <GeneralSection />}

      {activeTab === 'email' && <EmailSection formatAgo={formatAgo} />}

      {activeTab === 'data' && <CustomFieldsSection />}

      {activeTab === 'branding' && <BrandingSection />}

      {activeTab === 'pipeline' && <PipelineSection />}

      {activeTab === 'pipelines' && (
        <section className="crm-surface-section p-6">
          <SettingsPipelinesPanel />
        </section>
      )}

      {activeTab === 'permissions' && <PermissionsSection />}

      {activeTab === 'security' && (
        <section className="crm-surface-section p-6">
          <SettingsMfaPanel />
          <div className="mt-6">
            <SettingsSsoScimPanel />
          </div>
        </section>
      )}

      {activeTab === 'billing' && <BillingSection />}

      {activeTab === 'data' && <DataSection />}

      {activeTab === 'navigation' && <NavigationSection />}

      {activeTab === 'webhooks' && (
        <section className="crm-surface-section p-6">
          <SettingsWebhooksPanel />
        </section>
      )}

      {activeTab === 'integrations' && (
        <section className="crm-surface-section p-6">
          <SettingsIntegrationsPanel />
        </section>
      )}

      {activeTab === 'advanced' && <AdvancedSection formatAgo={formatAgo} />}
    </div>
  )
}

export default Settings
