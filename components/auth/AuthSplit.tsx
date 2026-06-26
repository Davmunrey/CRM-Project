'use client'

import type { ReactNode } from 'react'

/**
 * Propel auth split-panel — ink brand panel (gradient + testimonial) beside a
 * white form panel, on warm paper. Matches the "Propel App · Login" brand design.
 */

export const DISPLAY = { fontFamily: 'var(--font-display), sans-serif' } as const
export const BODY = { fontFamily: 'var(--font-hanken), sans-serif' } as const
export const MONO = { fontFamily: 'var(--font-mono), monospace' } as const

function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" fill="#11A57E" />
      <path d="M12 13 L20 20 L12 27" stroke="#06231B" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 13 L28 20 L20 27" stroke="#0C1F1A" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
    </svg>
  )
}

export interface AuthFieldProps {
  label: string
  icon: ReactNode
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  required?: boolean
  inputMode?: 'numeric' | 'text' | 'email'
  accentIcon?: boolean
}

export function AuthField({
  label,
  icon,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  autoFocus,
  required,
  inputMode,
  accentIcon,
}: AuthFieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          ...DISPLAY,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: '#3F4D48',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-[10px] border border-[#E0DCD2] bg-white px-3.5 transition focus-within:border-[#0C8A68] focus-within:ring-[3px] focus-within:ring-[#0C8A68]/15">
        <span style={{ color: accentIcon ? '#0C8A68' : '#A6ABA4', display: 'inline-flex', flex: 'none' }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          inputMode={inputMode}
          style={{
            border: 'none',
            outline: 'none',
            padding: '13px 0',
            ...BODY,
            fontSize: 15,
            color: '#0C1F1A',
            width: '100%',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  )
}

export interface AuthSplitProps {
  appName?: string
  headline: ReactNode
  subtext: ReactNode
  children: ReactNode
  /** Optional testimonial override; pass null to hide. */
  testimonial?: { quote: string; initials: string; name: string; role: string } | null
}

const DEFAULT_TESTIMONIAL = {
  quote:
    '“We cut our follow-up time 18× in the first month. Propel tells us who’s slipping before we’d ever notice.”',
  initials: 'SM',
  name: 'Sara Méndez',
  role: 'Head of Sales, Northwind',
}

export function AuthSplit({ appName = 'Propel', headline, subtext, children, testimonial }: AuthSplitProps) {
  const tm = testimonial === undefined ? DEFAULT_TESTIMONIAL : testimonial
  return (
    <div
      style={{ minHeight: '100vh', background: '#EDEAE2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, ...BODY }}
    >
      <div
        className="grid w-full max-w-[1000px] overflow-hidden lg:grid-cols-[1.05fr_1fr]"
        style={{ borderRadius: 18, border: '1px solid #DAD6CC', boxShadow: '0 30px 70px -40px rgba(12,31,26,0.45)', background: '#fff', minHeight: 600 }}
      >
        {/* brand panel */}
        <div
          className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
          style={{ background: '#0C1F1A', color: '#FBFAF7', padding: 48 }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(620px 380px at 88% -10%, rgba(17,165,126,0.32), transparent 60%), radial-gradient(380px 280px at -10% 120%, rgba(255,106,69,0.16), transparent 60%)',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
            <Mark size={34} />
            <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{appName}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 34, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 18, maxWidth: '16ch' }}>
              {headline}
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 300, color: '#9FB3AB', maxWidth: '38ch', margin: 0 }}>{subtext}</p>
          </div>
          {tm ? (
            <div style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 300, color: '#C9D6D0', margin: '0 0 12px', fontStyle: 'italic' }}>{tm.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#11A57E', display: 'flex', alignItems: 'center', justifyContent: 'center', ...DISPLAY, fontWeight: 700, fontSize: 12, color: '#06231B' }}>
                  {tm.initials}
                </div>
                <div>
                  <div style={{ ...DISPLAY, fontSize: 13, fontWeight: 600 }}>{tm.name}</div>
                  <div style={{ ...BODY, fontSize: 12, color: '#8FA39B' }}>{tm.role}</div>
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* form panel */}
        <div className="flex flex-col justify-center" style={{ padding: '48px clamp(28px, 5vw, 56px)' }}>
          {/* compact brand for mobile (no left panel) */}
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <Mark size={30} />
            <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: '#0C1F1A' }}>{appName}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
