import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'
import { useTranslations } from '../../i18n'

type PanelRect = { top: number; left: number; width: number; maxHeight: number }

function computePanelRect(trigger: HTMLButtonElement): PanelRect {
  const r = trigger.getBoundingClientRect()
  const gap = 4
  const margin = 8
  const maxPanel = 320
  const spaceBelow = window.innerHeight - r.bottom - gap - margin
  const maxHeight =
    spaceBelow <= 0
      ? Math.min(maxPanel, 120)
      : Math.min(maxPanel, Math.max(spaceBelow, 48))
  const left = Math.max(margin, Math.min(r.left, window.innerWidth - r.width - margin))
  return {
    top: r.bottom + gap,
    left,
    width: r.width,
    maxHeight,
  }
}

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  searchPlaceholder?: string
  /** Shown when the filter returns no options (e.g. `t.common.noResults`). */
  emptyLabel?: string
  id?: string
  className?: string
  /** Max height of the scrollable option list (Tailwind class). */
  listMaxHeightClass?: string
  /** When `label` is omitted, set this for an accessible trigger name. */
  ariaLabel?: string
}

/**
 * Long lists (e.g. LinkedIn industries): button trigger + filterable panel.
 * Pattern matches `Select` / `DropdownMenu` (backdrop, z-index, rounded-xl).
 */
export function SearchableSelect({
  label,
  hint,
  error,
  required,
  disabled,
  options,
  value,
  onChange,
  onBlur,
  placeholder = '',
  searchPlaceholder = '',
  emptyLabel = '',
  id,
  className = '',
  listMaxHeightClass = 'max-h-56',
  ariaLabel,
}: SearchableSelectProps) {
  const t = useTranslations()
  const genId = useId()
  const baseId = id ?? genId
  const listboxId = `${baseId}-listbox`
  const errId = `${baseId}-error`
  const hintId = `${baseId}-hint`
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)

  useEffect(() => {
    
    if (!open) setQuery('')
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      
      setPanelRect(null)
      return
    }
    const el = triggerRef.current
    if (!el) return
    const update = () => {
      if (triggerRef.current) setPanelRect(computePanelRect(triggerRef.current))
    }
    update()
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {label ? (
        <label htmlFor={baseId} className="text-sm font-medium text-fg-muted">
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <button
          ref={triggerRef}
          id={baseId}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          onBlur={onBlur}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`
            focus-ring relative w-full flex items-center justify-between gap-2 rounded-xl border bg-surface-2 text-left text-sm
            focus-visible:border-accent-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition duration-base pl-3 pr-8 py-2 min-h-control hover:border-border-strong
            ${error ? 'border-danger/50 focus-visible:ring-danger/30' : 'border-border-subtle'}
          `}
        >
          <span className={`truncate ${selectedLabel ? 'text-fg' : 'text-fg-muted'}`}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown size={14} className="shrink-0 text-fg-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden />
        </button>

        {open &&
          panelRect &&
          createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-overlay cursor-default bg-transparent"
                aria-label={t.common.closeMenu}
                onClick={() => setOpen(false)}
              />
              <div
                className="fixed z-dropdown flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-1 shadow-lg pointer-events-auto animate-scale-in origin-top"
                style={{
                  top: panelRect.top,
                  left: panelRect.left,
                  width: panelRect.width,
                  maxHeight: panelRect.maxHeight,
                }}
              >
                <div className="border-b border-border-subtle p-2 shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" aria-hidden />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="focus-ring w-full rounded-lg border border-border-subtle bg-surface-2 py-1.5 pl-8 pr-2 text-sm text-fg placeholder:text-fg-muted/70 focus-visible:border-accent-500/50"
                      autoComplete="off"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div
                  id={listboxId}
                  role="listbox"
                  aria-label={label}
                  className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 ${listMaxHeightClass}`}
                >
                  {filtered.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-fg-muted">{emptyLabel || t.common.emptyCell}</div>
                  ) : (
                    filtered.map((opt) => {
                      const selected = opt.value === value
                      return (
                        <div
                          key={opt.value}
                          role="option"
                          aria-selected={selected}
                          tabIndex={-1}
                          className={`
                          cursor-pointer px-3 py-2 text-sm transition-colors
                          ${selected ? 'bg-accent-500/12 text-fg font-medium' : 'text-fg hover:bg-fg/[0.06]'}
                        `}
                          onClick={() => {
                            onChange(opt.value)
                            setOpen(false)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onChange(opt.value)
                              setOpen(false)
                            }
                          }}
                        >
                          {opt.label}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>,
            document.body,
          )}
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
