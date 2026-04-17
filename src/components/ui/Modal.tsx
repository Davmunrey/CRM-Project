import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { useTranslations } from '../../i18n'

export function DialogPanelHeader({
  title,
  onClose,
  closeLabel,
}: {
  title: string
  onClose: () => void
  closeLabel: string
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <IconButton
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        icon={<X size={16} aria-hidden />}
      />
    </div>
  )
}

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function SlideOver({ isOpen, onClose, title, children, width = 'lg' }: SlideOverProps) {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
      window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )?.focus()
      }, 0)
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      lastFocusedRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-modal overflow-hidden" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-surface-0/80 backdrop-blur-md animate-fade-in modal-backdrop"
        onClick={onClose}
      />
      <div ref={panelRef} className={`absolute inset-y-0 right-0 flex w-full ${widthClasses[width]} animate-slide-in`}>
        <div className="slide-panel flex flex-col w-full bg-surface-2/95 border-l border-border-subtle shadow-float backdrop-blur-sm">
          <DialogPanelHeader title={title} onClose={onClose} closeLabel={t.common.close} />
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const modalSizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) {
  const t = useTranslations()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
      window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )?.focus()
      }, 0)
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      lastFocusedRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-surface-0/80 backdrop-blur-md animate-fade-in modal-backdrop"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`relative w-full ${modalSizeClasses[size]} glass border border-border-subtle rounded-2xl shadow-float animate-scale-in flex flex-col max-h-[90vh]`}
      >
        <DialogPanelHeader title={title} onClose={onClose} closeLabel={t.common.close} />
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger = false,
}: ConfirmDialogProps) {
  const t = useTranslations()
  const confirmText = confirmLabel ?? t.common.confirm
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-surface-0/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass rounded-2xl shadow-float p-6 w-full max-w-sm mx-4 animate-scale-in border border-border-subtle">
        <h3 className="text-base font-semibold text-fg mb-2">{title}</h3>
        <p className="text-sm text-fg-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
