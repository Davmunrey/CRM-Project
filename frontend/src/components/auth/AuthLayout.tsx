import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { LanguageSwitcher } from '../shared/LanguageSwitcher'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { Logo } from '../brand/Logo'

export interface AuthLayoutProps {
  variant?: 'centered' | 'split'
  /** Left / top marketing panel when `variant="split"` (desktop + compact mobile). */
  splitPanel?: ReactNode
  /** Override default branding badge (Zap + `primaryColor`). */
  logo?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** When `false`, centered layout skips the default logo/title block (e.g. loading states). */
  showBrandingHeader?: boolean
}

export function AuthLayout({
  variant = 'centered',
  splitPanel,
  logo,
  title,
  subtitle,
  footer,
  children,
  showBrandingHeader = true,
}: AuthLayoutProps) {
  const [branding, setBranding] = useState(useSettingsStore.getState().settings.branding)
  useEffect(() => {
    return useSettingsStore.subscribe((s) => setBranding(s.settings.branding))
  }, [])

  const defaultLogo = (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-brand-sm mb-4 overflow-hidden" style={{ backgroundColor: branding.primaryColor }}>
      {branding.logoUrl ? (
        <img src={branding.logoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Logo variant="icon" theme="onAccent" size={28} />
      )}
    </div>
  )

  const headerBlock = (
    <div className="text-center mb-8">
      {logo ?? defaultLogo}
      {title != null ? <div className="mt-1">{title}</div> : null}
      {subtitle != null ? <div className="mt-1">{subtitle}</div> : null}
    </div>
  )

  const blobs = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="auth-bg-blob absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      <div className="auth-bg-blob absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-700/8 rounded-full blur-3xl" />
    </div>
  )

  return (
    <div className="auth-page-bg min-h-screen bg-surface-0 text-fg">
      <LanguageSwitcher variant="floating" />
      <ThemeSwitcher variant="floating" />
      {blobs}

      {variant === 'split' ? (
        <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 py-12 border-r border-fg/8 bg-surface-0/40">
            {splitPanel}
          </div>
          <div className="flex-1 flex flex-col justify-center p-4 sm:p-8 lg:px-12 xl:px-16 py-8">
            <div className="lg:hidden mb-6">{splitPanel}</div>
            <div className="w-full max-w-md mx-auto">
              {children}
            </div>
            {footer ? <div className="w-full max-w-md mx-auto mt-4">{footer}</div> : null}
          </div>
        </div>
      ) : (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {showBrandingHeader ? headerBlock : null}
            {children}
            {footer ? <div className="mt-3">{footer}</div> : null}
          </div>
        </div>
      )}
    </div>
  )
}
