import type { ReactNode } from 'react'
import { useId, useState } from 'react'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

const sideClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1',
}

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: TooltipSide
  /** Delay before show (ms) */
  delayMs?: number
}

export function Tooltip({ content, children, side = 'top', delayMs = 200 }: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  let showTimer: ReturnType<typeof setTimeout> | undefined

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => {
        showTimer = setTimeout(() => setOpen(true), delayMs)
      }}
      onPointerLeave={() => {
        if (showTimer) clearTimeout(showTimer)
        setOpen(false)
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`
            absolute z-tooltip pointer-events-none
            max-w-xs rounded-lg border border-border-subtle bg-surface-1 px-2 py-1.5 text-xs text-fg shadow-md
            animate-fade-in duration-fast
            ${sideClasses[side]}
          `}
        >
          {content}
        </span>
      )}
    </span>
  )
}
