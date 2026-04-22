import { useTranslations } from '../../i18n'

export type LogoVariant = 'lockup' | 'icon' | 'wordmark'
export type LogoTheme = 'light' | 'dark' | 'mono'

export interface LogoProps {
  variant?: LogoVariant
  theme?: LogoTheme
  /** Icon / lockup mark size in px */
  size?: number
  className?: string
}

export function Logo({
  variant = 'lockup',
  theme = 'light',
  size = 32,
  className,
}: LogoProps) {
  const t = useTranslations()
  const sailColor =
    theme === 'dark' ? '#8B84FF' : theme === 'mono' ? 'currentColor' : '#4F46E5'
  const mastColor =
    theme === 'dark' ? '#F6F5F1' : theme === 'mono' ? 'currentColor' : '#1E1B4B'
  const textColor =
    theme === 'dark' ? '#F6F5F1' : theme === 'mono' ? 'currentColor' : '#12121A'

  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M 14 46 C 14 46 14 10 14 10 C 34 10 46 26 46 40 C 46 44 44 46 40 46 Z"
        fill={sailColor}
      />
      <rect x="10" y="8" width="4" height="38" rx="2" fill={mastColor} />
    </svg>
  )

  const Wordmark = (
    <span
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
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
    <span className={['inline-flex items-center gap-2', wrapClass].filter(Boolean).join(' ')} aria-label={t.brand.productName}>
      {Icon}
      {Wordmark}
    </span>
  )
}
