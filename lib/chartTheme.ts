/**
 * Recharts colors derived from CSS design tokens so charts respect light/dark and branding.
 */
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'

export interface ChartTheme {
  tooltipStyle: CSSProperties
  gridStroke: string
  axisTickFill: string
  labelMutedFill: string
  barGradientTop: string
  barGradientBottom: string
  barPrimary: string
  barSecondary: string
  seriesPalette: string[]
  success: string
  successMuted: string
  danger: string
  info: string
  /** Main foreground for SVG text (matches --color-fg). */
  fg: string
}

function triplet(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Snapshot of theme-aware colors for Recharts (call inside render after paint). */
export function getChartThemeSnapshot(): ChartTheme {
  const s1 = triplet('--color-surface-1', '17 18 32')
  const fgMain = triplet('--color-fg', '241 245 249')
  const fg = triplet('--color-fg-muted', '148 163 184')
  const fgSub = triplet('--color-fg-subtle', '100 116 139')
  const bs = triplet('--color-border-subtle', '255 255 255')
  const op = getComputedStyle(document.documentElement).getPropertyValue('--opacity-border-subtle').trim() || '0.08'
  const a400 = triplet('--color-accent-400', '129 140 248')
  const a500 = triplet('--color-accent-500', '99 102 241')
  const a600 = triplet('--color-accent-600', '79 70 229')
  const a300 = triplet('--color-accent-300', '165 180 252')
  const success = triplet('--color-success', '34 197 94')
  const warning = triplet('--color-warning', '245 158 11')
  const danger = triplet('--color-danger', '239 68 68')
  const info = triplet('--color-info', '59 130 246')

  const borderSubtle = `rgba(${bs} / ${op})`

  return {
    tooltipStyle: {
      backgroundColor: `rgb(${s1})`,
      border: `1px solid ${borderSubtle}`,
      borderRadius: '12px',
      color: `rgb(${fg})`,
    },
    fg: `rgb(${fgMain})`,
    gridStroke: `rgba(${fgSub} / 0.22)`,
    axisTickFill: `rgb(${fgSub})`,
    labelMutedFill: `rgb(${fg})`,
    barGradientTop: `rgb(${a500})`,
    barGradientBottom: `rgb(${a600})`,
    barPrimary: `rgb(${a500})`,
    barSecondary: `rgb(${a400})`,
    seriesPalette: [
      `rgb(${a500})`,
      `rgb(${a400})`,
      `rgb(${a300})`,
      `rgb(${warning})`,
      `rgb(${success})`,
      `rgb(${info})`,
    ],
    success: `rgb(${success})`,
    successMuted: `rgba(${success} / 0.25)`,
    danger: `rgb(${danger})`,
    info: `rgb(${info})`,
  }
}

/**
 * Recomputes when `document.documentElement` class changes (e.g. `light` / branding).
 */
export function useChartTheme(): ChartTheme {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const root = document.documentElement
    const obs = new MutationObserver(() => {
      setVersion((v) => v + 1)
    })
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => obs.disconnect()
  }, [])

  // version is used to retrigger the snapshot when the theme class changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getChartThemeSnapshot(), [version])
}
