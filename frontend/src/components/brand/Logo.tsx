import { useId } from 'react'
import { useTranslations } from '../../i18n'

export type LogoVariant = 'lockup' | 'icon' | 'wordmark'
/**
 * `light` / `dark`: full-color V-spark mark for neutral surfaces.
 * `onAccent`: mark on saturated brand tiles (login, sidebar) — V is white-tinted, spark stays coral.
 * `mono`: V follows `currentColor` (rare — print, single-ink stamps); spark stays coral per brand kit.
 */
export type LogoTheme = 'light' | 'dark' | 'mono' | 'onAccent'

/** Lockup wordmark style — see brand kit §01 "Lockups". */
export type LogoLockup = 'word' | 'dot' | 'product'

export interface LogoProps {
  variant?: LogoVariant
  theme?: LogoTheme
  /** Icon / lockup mark size in px (height of the V-spark glyph). */
  size?: number
  /** Lockup wordmark style: plain "Velo", "Velo." with coral dot, or "Velo / Sales". */
  lockup?: LogoLockup
  /** Subscript label for `product` lockup (defaults to "Sales"). */
  productLabel?: string
  className?: string
}

const ACCENT_CORAL = '#FF6B57'

function veloGradientDefs(theme: LogoTheme, gid: string) {
  const vId = `${gid}-v`

  if (theme === 'onAccent') {
    return (
      <defs>
        <linearGradient id={vId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
      </defs>
    )
  }

  if (theme === 'mono') {
    return (
      <defs>
        <linearGradient id={vId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.92} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={1} />
        </linearGradient>
      </defs>
    )
  }

  if (theme === 'dark') {
    return (
      <defs>
        <linearGradient id={vId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5A8FC" />
          <stop offset="55%" stopColor="#8B84FF" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    )
  }

  return (
    <defs>
      <linearGradient id={vId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="55%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#3730A3" />
      </linearGradient>
    </defs>
  )
}

export function Logo({
  variant = 'lockup',
  theme = 'light',
  size = 32,
  lockup = 'word',
  productLabel = 'Sales',
  className,
}: LogoProps) {
  const t = useTranslations()
  const rawId = useId()
  const gid = `vl-${rawId.replace(/:/g, '')}`

  const textColor =
    theme === 'dark' || theme === 'onAccent'
      ? '#F1F5F9'
      : theme === 'mono'
        ? 'currentColor'
        : '#1E1B4B'

  const productLabelColor =
    theme === 'dark' || theme === 'onAccent'
      ? 'rgba(241, 245, 249, 0.55)'
      : theme === 'mono'
        ? 'currentColor'
        : 'rgba(30, 27, 75, 0.55)'

  const vFill = `url(#${gid}-v)`
  const defs = veloGradientDefs(theme, gid)
  const sparkFill = ACCENT_CORAL
  const sparkAura = theme === 'mono' ? 0 : 0.45

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="overflow-visible"
    >
      {defs}
      {/* V-spark glyph — brand kit §01. The V is the brand. The spark is the urgency. */}
      <path
        d="M 10 10 L 32 54 L 54 10 L 42 10 L 32 36 L 22 10 Z"
        fill={vFill}
      />
      {sparkAura > 0 ? (
        <circle cx="50" cy="14" r="8.5" fill={sparkFill} opacity={sparkAura * 0.35} />
      ) : null}
      <circle cx="50" cy="14" r="5" fill={sparkFill} />
    </svg>
  )

  const wordFontSize = size * 0.72

  const Wordmark = (
    <span
      style={{
        fontFamily: "'General Sans', system-ui, sans-serif",
        fontWeight: 700,
        letterSpacing: '-0.035em',
        fontSize: wordFontSize,
        lineHeight: 1,
        color: textColor,
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      {t.brand.productName}
      {lockup === 'dot' ? (
        <span aria-hidden style={{ color: ACCENT_CORAL, marginLeft: 1 }}>.</span>
      ) : null}
      {lockup === 'product' ? (
        <span
          aria-hidden
          style={{
            color: productLabelColor,
            fontWeight: 500,
            marginLeft: wordFontSize * 0.45,
            fontSize: wordFontSize * 0.78,
          }}
        >
          / {productLabel}
        </span>
      ) : null}
    </span>
  )

  const wrapClass = [className].filter(Boolean).join(' ')

  if (variant === 'icon') {
    return <span className={wrapClass}>{Icon}</span>
  }
  if (variant === 'wordmark') {
    return <span className={wrapClass}>{Wordmark}</span>
  }

  return (
    <span
      className={['inline-flex items-center gap-2', wrapClass].filter(Boolean).join(' ')}
      aria-label={t.brand.productName}
    >
      {Icon}
      {Wordmark}
    </span>
  )
}
