import { appChannel } from '@/lib/envChannel'
import { useTranslations } from '../../i18n'

export function EnvironmentBanner() {
  const t = useTranslations()
  if (appChannel === 'staging') {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-xs font-medium text-warning"
      >
        {t.common.envBannerStaging}
      </div>
    )
  }
  if (appChannel === 'demo') {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-accent-500/40 bg-accent-500/15 px-4 py-2 text-center text-xs font-medium text-accent-100"
      >
        {t.common.envBannerDemo}
      </div>
    )
  }
  return null
}
