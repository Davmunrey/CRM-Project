import type { InputHTMLAttributes } from 'react'

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Radio({ className = '', ...props }: RadioProps) {
  return (
    <input
      type="radio"
      className={`
        h-4 w-4 border-border-strong bg-surface-2 text-accent-600
        focus-ring
        ${className}
      `}
      {...props}
    />
  )
}
