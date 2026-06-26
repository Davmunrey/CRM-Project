import type { KeyboardEvent } from 'react'

/** Enter / Space on a clickable table row (with tabIndex={0}). */
export function rowActivationKeyDown(e: KeyboardEvent, action: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    action()
  }
}
