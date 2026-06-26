export type LogoVariant = 'lockup' | 'icon' | 'wordmark'
export type LogoTheme = 'light' | 'dark' | 'mono' | 'onAccent'

export interface LogoProps {
  variant?: LogoVariant
  theme?: LogoTheme
  size?: number
  className?: string
}

const MINT = '#44C2A0'
const MINT_LIGHT = '#9BE8CE'
const CREAM = '#FBFAF7'
const INK = '#0C1F1A'

function strokeForTheme(theme: LogoTheme): { primary: string; secondary: string } {
  switch (theme) {
    case 'dark':
    case 'onAccent':
      return { primary: CREAM, secondary: MINT_LIGHT }
    case 'mono':
      return { primary: 'currentColor', secondary: 'currentColor' }
    default:
      return { primary: INK, secondary: MINT }
  }
}

/** Propel double-chevron mark + optional wordmark */
export function Logo({ variant = 'lockup', theme = 'light', size = 32, className }: LogoProps) {
  const { primary, secondary } = strokeForTheme(theme)
  const h = size
  const w = variant === 'icon' ? h * 1.2 : h * 1.2

  const mark = (
    <svg
      width={w}
      height={h}
      viewBox="0 0 48 32"
      aria-hidden
      className="shrink-0"
    >
      <g transform="translate(24 16)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M-14 -10 L2 0 L-14 10" stroke={primary} strokeWidth="4" />
        <path d="M4 -10 L20 0 L4 10" stroke={secondary} strokeWidth="4" />
      </g>
    </svg>
  )

  if (variant === 'icon') {
    return (
      <span className={className} aria-label="Propel">
        {mark}
      </span>
    )
  }

  const textColor = theme === 'light' ? INK : CREAM
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`} aria-label="Propel">
      {mark}
      <span
        style={{
          fontSize: size * 0.85,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: textColor,
        }}
      >
        Propel
      </span>
    </span>
  )
}
