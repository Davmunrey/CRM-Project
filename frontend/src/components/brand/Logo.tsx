export type LogoVariant = 'lockup' | 'icon' | 'wordmark'

/**
 * `light`    — ink text on white/light surfaces (default)
 * `dark`     — white text on dark surfaces
 * `onAccent` — white text on saturated brand tiles (login, sidebar)
 * `mono`     — follows `currentColor`; cursor stays coral (print, single-ink)
 */
export type LogoTheme = 'light' | 'dark' | 'mono' | 'onAccent'

/** Lockup wordmark style — see brand kit §01 "Lockups". */
export type LogoLockup = 'word' | 'dot' | 'product'

export interface LogoProps {
  variant?: LogoVariant
  theme?: LogoTheme
  /** Font size in px — acts as the height equivalent of the mark. */
  size?: number
  /** Lockup style: `word` (plain), `dot` (compat, no-op), `product` (adds "/ {productLabel}"). */
  lockup?: LogoLockup
  /** Label for `product` lockup (defaults to "Sales"). */
  productLabel?: string
  className?: string
}

const CURSOR_CORAL = '#E8523A'

/** Resolve the wordmark text color for a given theme. */
function resolveTextColor(theme: LogoTheme): string {
  switch (theme) {
    case 'dark':
    case 'onAccent':
      return '#FFFFFF'
    case 'mono':
      return 'currentColor'
    default:
      return '#0D0D20'
  }
}

/** Resolve the product-label secondary color for a given theme. */
function resolveProductLabelColor(theme: LogoTheme): string {
  switch (theme) {
    case 'dark':
    case 'onAccent':
      return 'rgba(255, 255, 255, 0.55)'
    case 'mono':
      return 'currentColor'
    default:
      return 'rgba(13, 13, 32, 0.50)'
  }
}

export function Logo({
  variant = 'lockup',
  theme = 'light',
  size = 32,
  lockup = 'word',
  productLabel = 'Sales',
  className,
}: LogoProps) {
  const textColor = resolveTextColor(theme)
  const productLabelColor = resolveProductLabelColor(theme)

  const wrapClass = className ?? ''

  const baseStyle: React.CSSProperties = {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    fontSize: size,
    color: textColor,
    display: 'inline-flex',
    alignItems: 'baseline',
    whiteSpace: 'nowrap',
  }

  /** The coral cursor character — shared by all variants. */
  const Cursor = (
    <span aria-hidden style={{ color: CURSOR_CORAL }}>
      _
    </span>
  )

  // ── icon variant ────────────────────────────────────────────────────────────
  // Shows only "n0_" — the minimal mark, no accent line.
  if (variant === 'icon') {
    return (
      <span
        className={wrapClass}
        aria-label="n0crm"
        style={baseStyle}
      >
        n0{Cursor}
      </span>
    )
  }

  // ── wordmark variant ─────────────────────────────────────────────────────────
  // Full "n0crm_" inline, no accent line.
  if (variant === 'wordmark') {
    return (
      <span
        className={wrapClass}
        aria-label="n0crm"
        style={baseStyle}
      >
        n0crm{Cursor}
        {lockup === 'product' ? (
          <span
            aria-hidden
            style={{
              color: productLabelColor,
              fontWeight: 500,
              marginLeft: size * 0.45,
              fontSize: size * 0.78,
            }}
          >
            / {productLabel}
          </span>
        ) : null}
      </span>
    )
  }

  // ── lockup variant (default) ─────────────────────────────────────────────────
  // Column stack: wordmark row on top, coral accent line below.
  const accentLineHeight = Math.max(2, size * 0.06)
  const accentLineMarginTop = size * 0.1

  return (
    <span
      className={wrapClass}
      aria-label="n0crm"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {/* Row 1 — wordmark */}
      <span style={baseStyle}>
        n0crm{Cursor}
        {lockup === 'product' ? (
          <span
            aria-hidden
            style={{
              color: productLabelColor,
              fontWeight: 500,
              marginLeft: size * 0.45,
              fontSize: size * 0.78,
            }}
          >
            / {productLabel}
          </span>
        ) : null}
      </span>

      {/* Row 2 — coral accent line */}
      <span
        aria-hidden
        style={{
          display: 'block',
          width: '82%',
          height: accentLineHeight,
          marginTop: accentLineMarginTop,
          backgroundColor: CURSOR_CORAL,
          borderRadius: 2,
        }}
      />
    </span>
  )
}
