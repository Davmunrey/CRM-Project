import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslations } from '../i18n'
import { CalendarIntegrationCard } from '../components/integrations/CalendarIntegrationCard'
import { GoogleIntegrationCard } from '../components/integrations/GoogleIntegrationCard'
import { SlackIntegrationCard } from '../components/integrations/SlackIntegrationCard'
import { GoogleContactsCard } from '../components/integrations/GoogleContactsCard'
import { ZoomIntegrationCard } from '../components/integrations/ZoomIntegrationCard'

export function SettingsIntegrations() {
  const t = useTranslations()

  return (
    <div className="crm-page max-w-3xl space-y-6">
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t.settings.backToSettings}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{t.settings.integrationsPageTitle}</h1>
        <p className="text-sm text-fg-muted mt-1 max-w-2xl">{t.settings.integrationsPageSubtitle}</p>
      </div>

      <GoogleIntegrationCard />
      <CalendarIntegrationCard />
      <GoogleContactsCard />
      <ZoomIntegrationCard />
      <SlackIntegrationCard />
    </div>
  )
}
