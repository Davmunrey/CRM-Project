import type { InputHTMLAttributes } from 'react'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`
        h-4 w-4 rounded border-border-strong bg-surface-2 text-accent-600
        focus-ring focus:ring-offset-0 focus:ring-offset-transparent
        ${className}
      `}
      {...props}
    />
  )
}
