import { useId } from 'react'
import { useTranslations } from '../../i18n'

export type LogoVariant = 'lockup' | 'icon' | 'wordmark'
/** `light` / `dark`: full-color mark for neutral surfaces. `onAccent`: mark on saturated brand tiles (login, sidebar). `mono`: single ink via `currentColor` (rare). */
export type LogoTheme = 'light' | 'dark' | 'mono' | 'onAccent'

export interface LogoProps {
  variant?: LogoVariant
  theme?: LogoTheme
  /** Icon / lockup mark size in px */
  size?: number
  className?: string
}

function gradientDefs(theme: LogoTheme, gid: string) {
  const sailId = `${gid}-sail`
  const mastId = `${gid}-mast`
  const sheenId = `${gid}-sheen`

  /** Mark on primary/accent fill: high contrast, no `currentColor` (avoids muddy blends on purple). */
  if (theme === 'onAccent') {
    return (
      <defs>
        <linearGradient id={sailId} x1="14" y1="11" x2="46" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="38%" stopColor="#EEF2FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient id={mastId} x1="12" y1="8" x2="12" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <radialGradient id={sheenId} cx="28%" cy="16%" r="50%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
    )
  }

  if (theme === 'mono') {
    return (
      <defs>
        <linearGradient id={sailId} x1="16" y1="12" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.55} />
          <stop offset="50%" stopColor="currentColor" stopOpacity={0.92} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0.8} />
        </linearGradient>
        <linearGradient id={mastId} x1="12" y1="8" x2="12" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.85} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={1} />
        </linearGradient>
        <radialGradient id={sheenId} cx="32%" cy="22%" r="58%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </radialGradient>
      </defs>
    )
  }

  if (theme === 'dark') {
    return (
      <defs>
        <linearGradient id={sailId} x1="16" y1="12" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="42%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id={mastId} x1="12" y1="8" x2="12" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <radialGradient id={sheenId} cx="34%" cy="20%" r="55%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
    )
  }

  return (
    <defs>
      <linearGradient id={sailId} x1="16" y1="10" x2="46" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A5B4FC" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#4338CA" />
      </linearGradient>
      <linearGradient id={mastId} x1="12" y1="8" x2="12" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3730A3" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
    </defs>
  )
}

export function Logo({
  variant = 'lockup',
  theme = 'light',
  size = 32,
  className,
}: LogoProps) {
  const t = useTranslations()
  const rawId = useId()
  const gid = `vl-${rawId.replace(/:/g, '')}`

  const textColor =
    theme === 'dark' || theme === 'onAccent'
      ? '#F8FAFC'
      : theme === 'mono'
        ? 'currentColor'
        : '#12121A'

  const sailFill = `url(#${gid}-sail)`
  const mastFill = `url(#${gid}-mast)`
  const sheenFill = `url(#${gid}-sheen)`
  const defs = gradientDefs(theme, gid)
  const hasSheen = theme !== 'light'

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="overflow-visible"
    >
      {defs}
      <g>
        <path
          d="M 14 46 C 14 46 14 10 14 10 C 34 10 46 26 46 40 C 46 44 44 46 40 46 Z"
          fill={sailFill}
        />
        {hasSheen ? (
          <path
            d="M 14 46 C 14 46 14 10 14 10 C 34 10 46 26 46 40 C 46 44 44 46 40 46 Z"
            fill={sheenFill}
            style={{ mixBlendMode: theme === 'onAccent' ? 'overlay' : 'soft-light' }}
          />
        ) : null}
        <rect x="10" y="8" width="4" height="38" rx="2" fill={mastFill} />
      </g>
    </svg>
  )

  const Wordmark = (
    <span
      style={{
        fontFamily: "'General Sans', system-ui, sans-serif",
        fontWeight: 700,
        letterSpacing: '-0.035em',
        fontSize: size * 0.72,
        lineHeight: 1,
        color: textColor,
      }}
    >
      {t.brand.productName}
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
