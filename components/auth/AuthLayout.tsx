import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
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

// ─── Ambient parallax backdrop ───────────────────────────────────────────────
// Three soft layers that drift + breathe on their own (CSS) and shift at
// different depths as the pointer moves (JS). Pure decoration, motion-safe.
function AuthBackdrop() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia?.('(pointer: coarse)').matches) return // skip on touch

    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-depth]'))
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5 // -0.5 … 0.5
        const ny = e.clientY / window.innerHeight - 0.5
        for (const layer of layers) {
          const depth = Number(layer.dataset.depth) || 0
          layer.style.setProperty('--parallax-x', `${(-nx * depth).toFixed(1)}px`)
          layer.style.setProperty('--parallax-y', `${(-ny * depth).toFixed(1)}px`)
        }
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="parallax-layer absolute top-1/4 left-1/4" data-depth="46">
        <div
          className="auth-bg-blob w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"
          style={{ ['--drift-dur' as string]: '23s', ['--drift-x' as string]: '30px', ['--drift-y' as string]: '-22px' }}
        />
      </div>
      <div className="parallax-layer absolute bottom-1/4 right-1/4" data-depth="72">
        <div
          className="auth-bg-blob w-96 h-96 bg-accent-700/8 rounded-full blur-3xl"
          style={{ ['--drift-dur' as string]: '31s', ['--drift-x' as string]: '-26px', ['--drift-y' as string]: '20px', animationDirection: 'reverse' }}
        />
      </div>
      <div className="parallax-layer absolute top-[58%] left-[60%]" data-depth="120">
        <div
          className="auth-bg-blob w-72 h-72 bg-accent-400/8 rounded-full blur-3xl"
          style={{ ['--drift-dur' as string]: '19s', ['--drift-x' as string]: '24px', ['--drift-y' as string]: '26px', ['--drift-scale' as string]: '1.1' }}
        />
      </div>
    </div>
  )
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
    <div className="flex items-center justify-center mx-auto mb-4 text-fg">
      {branding.logoUrl ? (
        <img src={branding.logoUrl} alt={branding.appName} className="h-11 w-auto object-contain" />
      ) : (
        <Logo variant="icon" theme="mono" size={34} />
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

  return (
    <div className="auth-page-bg min-h-screen bg-surface-0 text-fg">
      <LanguageSwitcher variant="floating" />
      <ThemeSwitcher variant="floating" />
      <AuthBackdrop />

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
