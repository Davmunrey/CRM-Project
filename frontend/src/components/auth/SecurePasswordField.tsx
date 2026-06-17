import { useId, useMemo, useState } from 'react'
import { Lock, Eye, EyeOff, Check, Circle } from 'lucide-react'
import { useTranslations } from '../../i18n'
import type { Translations } from '../../i18n/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import {
  generateSecurePassword,
  getPasswordRuleMet,
  STRONG_PASSWORD_MIN_LENGTH,
  type PasswordStrengthIssue,
} from '../../lib/securePassword'

const RULE_ORDER: PasswordStrengthIssue[] = ['length', 'lower', 'upper', 'digit', 'symbol']

/** Checklist copy from parent — avoids a second `useTranslations()` inside the checklist subtree. */
function PasswordRequirementChecklist({
  password,
  compact,
  policyTitle,
  labels,
}: {
  password: string
  compact?: boolean
  policyTitle: string
  labels: Record<PasswordStrengthIssue, string>
}) {
  const met = getPasswordRuleMet(password)
  const titleCls = compact ? 'text-[10px]' : 'text-[11px]'
  const rowCls = compact ? 'text-[10px]' : 'text-[11px]'
  const iconSize = compact ? 11 : 12

  return (
    <div className={`mt-1 space-y-1 ${compact ? 'max-w-full' : ''}`} aria-live="polite">
      <p className={`${titleCls} font-medium text-fg-muted`}>{policyTitle}</p>
      <ul className="space-y-0.5">
        {RULE_ORDER.map((key) => (
          <li key={key} className={`flex items-center gap-2 ${rowCls}`}>
            {met[key] ? (
              <Check size={iconSize} className="text-success shrink-0" aria-hidden />
            ) : (
              <Circle size={iconSize} className="text-fg-subtle shrink-0" aria-hidden />
            )}
            <span className={met[key] ? 'text-fg-subtle' : 'text-fg-muted'}>{labels[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function passwordChecklistLabels(t: Translations): Record<PasswordStrengthIssue, string> {
  return {
    length: t.errors.passwordWeakLength,
    lower: t.errors.passwordWeakLower,
    upper: t.errors.passwordWeakUpper,
    digit: t.errors.passwordWeakDigit,
    symbol: t.errors.passwordWeakSymbol,
  }
}

interface SecurePasswordFieldProps {
  value: string
  onChange: (value: string) => void
  /** When set, the generate button calls this with the new secret (e.g. sync confirm password). */
  onGeneratedPassword?: (password: string) => void
  /** Shown as the visible label (required marker added automatically when `required`). */
  label: string
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  autoComplete?: string
  /** When false, hides the generator (hint still shown). */
  showGenerator?: boolean
  /** When true, shows the one-line policy hint under the field. */
  showPolicyHint?: boolean
  /** Live checklist of rules (default true). */
  showRequirementChecklist?: boolean
  /** Tighter typography for narrow layouts (e.g. table footers). */
  compactChecklist?: boolean
  className?: string
  /**
   * When true (default), sets `minLength` on the input to the strong-password minimum.
   * Set false for login / current-password fields so existing shorter passwords can be submitted.
   */
  enforceStrongPasswordMinLength?: boolean
}

export function SecurePasswordField({
  value,
  onChange,
  onGeneratedPassword,
  label,
  placeholder,
  required,
  autoFocus,
  autoComplete = 'new-password',
  showGenerator = true,
  showPolicyHint = false,
  showRequirementChecklist = true,
  compactChecklist = false,
  className,
  enforceStrongPasswordMinLength = true,
}: SecurePasswordFieldProps) {
  const t = useTranslations()
  const checklistLabels = useMemo(() => passwordChecklistLabels(t), [t])
  const id = useId()
  const [show, setShow] = useState(false)

  const applyGenerated = () => {
    const next = generateSecurePassword()
    if (onGeneratedPassword) onGeneratedPassword(next)
    else onChange(next)
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg-muted">
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
        {showGenerator ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2 text-[11px] font-medium text-accent-400 hover:text-accent-300"
            onClick={applyGenerated}
          >
            {t.auth.generateSecurePassword}
          </Button>
        ) : null}
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-fg-muted">
          <Lock size={16} aria-hidden />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          {...(enforceStrongPasswordMinLength ? { minLength: STRONG_PASSWORD_MIN_LENGTH } : {})}
          className="focus-ring w-full rounded-xl border border-border-subtle bg-surface-2 text-fg text-sm
            placeholder:text-fg-muted/80 focus-visible:border-accent-500/50 hover:border-border-strong
            disabled:opacity-50 disabled:cursor-not-allowed transition duration-base min-h-control
            pl-9 pr-10 py-2"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <IconButton
            type="button"
            variant="subtle"
            className="p-1.5"
            aria-label={show ? t.auth.passwordHideAria : t.auth.passwordShowAria}
            icon={show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            onClick={() => setShow((v) => !v)}
          />
        </div>
      </div>
      {showRequirementChecklist ? (
        <div className="space-y-1">
          <PasswordRequirementChecklist
            password={value}
            compact={compactChecklist}
            policyTitle={t.auth.passwordPolicyTitle}
            labels={checklistLabels}
          />
          {!enforceStrongPasswordMinLength ? (
            <p className="text-[10px] text-fg-subtle leading-snug">{t.auth.passwordPolicyLoginHint}</p>
          ) : null}
        </div>
      ) : null}
      {showPolicyHint ? (
        <p className="text-xs text-fg-muted">{t.auth.passwordStrengthHint}</p>
      ) : null}
    </div>
  )
}
