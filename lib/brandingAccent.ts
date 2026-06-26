/**
 * Maps settings.branding.primaryColor to CSS accent tokens (--color-accent-*).
 */

function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '')
  if (h.length !== 6 || !/^[0-9a-fA-F]+$/.test(h)) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function toTriple({ r, g, b }: { r: number; g: number; b: number }): string {
  return `${r} ${g} ${b}`
}

function darken({ r, g, b }: { r: number; g: number; b: number }, amount: number): { r: number; g: number; b: number } {
  return {
    r: Math.max(0, r - amount),
    g: Math.max(0, g - amount),
    b: Math.max(0, b - amount),
  }
}

/**
 * Applies primary brand color to document CSS variables. Removes overrides when absent/invalid.
 */
export function applyBrandingAccentToDocument(primaryColor: string | undefined): void {
  const root = document.documentElement
  const keys = [
    '--color-accent-500',
    '--color-accent-600',
    '--color-accent-700',
    '--color-accent-800',
    '--color-ring',
  ] as const
  const clear = () => {
    for (const k of keys) root.style.removeProperty(k)
  }

  if (!primaryColor?.trim()) {
    clear()
    return
  }

  const rgb = parseHexToRgb(primaryColor)
  if (!rgb) {
    clear()
    return
  }

  root.style.setProperty('--color-accent-500', toTriple(rgb))
  root.style.setProperty('--color-accent-600', toTriple(darken(rgb, 20)))
  root.style.setProperty('--color-accent-700', toTriple(darken(rgb, 35)))
  root.style.setProperty('--color-accent-800', toTriple(darken(rgb, 50)))
  root.style.setProperty('--color-ring', toTriple(rgb))
}
