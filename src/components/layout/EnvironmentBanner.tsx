import { appChannel } from '@/lib/envChannel'
import { useTranslations } from '../../i18n'

export function EnvironmentBanner() {
  const t = useTranslations()
  if (appChannel === 'staging') {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-xs font-medium text-amber-100"
      >
        {t.common.envBannerStaging}
      </div>
    )
  }
  if (appChannel === 'demo') {
    return (
      <div
        role="status"
        className="shrink-0 border-b border-violet-500/40 bg-violet-500/15 px-4 py-2 text-center text-xs font-medium text-violet-100"
      >
        {t.common.envBannerDemo}
      </div>
    )
  }
  return null
}
