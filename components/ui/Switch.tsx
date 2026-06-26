interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  'aria-label'?: string
}

export function Switch({ checked, onChange, id, disabled, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-border-subtle
        transition-colors duration-base focus-ring
        ${checked ? 'bg-accent-600' : 'bg-surface-2'}
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      <span
        className={`
          pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-fg shadow-sm transition-transform duration-base
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}
