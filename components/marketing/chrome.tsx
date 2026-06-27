import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Shared marketing chrome (nav + footer + layout primitives) for Propel's
 * public sub-pages. Mirrors the visual language of `PropelLanding`
 * (Schibsted Grotesk display · Hanken Grotesk body · JetBrains Mono labels;
 * cream paper #FBFAF7, ink #0C1F1A sections, propel-green accents).
 */

export const DISPLAY = { fontFamily: 'var(--font-display), sans-serif' } as const
export const MONO = { fontFamily: 'var(--font-mono), monospace' } as const
export const BODY = { fontFamily: 'var(--font-hanken), sans-serif' } as const

/** Double-chevron "fast-forward" brand mark. */
export function Mark({ size = 30, badge = '#0C8A68', lead = '#fff', echo = '#9BE8CE' }: {
  size?: number; badge?: string; lead?: string; echo?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" fill={badge} />
      <path d="M12 13 L20 20 L12 27" stroke={lead} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 13 L28 20 L20 27" stroke={echo} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const navLinks = [
  ['Product', '/#product'],
  ['Features', '/#features'],
  ['Integrations', '/#connect'],
  ['Security', '/#security'],
  ['Pricing', '/#pricing'],
] as const

function MarketingNav() {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(14px)', background: 'rgba(251,250,247,0.82)', borderBottom: '1px solid #E8E5DD' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '15px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: '#0C1F1A' }}>
          <Mark size={30} />
          <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Propel</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30, ...DISPLAY, fontSize: 14.5, fontWeight: 500, color: '#3F4D48' }} className="max-md:hidden">
          {navLinks.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-[#0C8A68]">{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/login" style={{ ...DISPLAY, fontSize: 14.5, fontWeight: 600, color: '#0C1F1A' }}>Sign in</Link>
          <Link href="/register" style={{ ...DISPLAY, fontSize: 14.5, fontWeight: 600, color: '#fff', background: '#0C8A68', padding: '10px 18px', borderRadius: 9 }} className="transition-colors hover:!bg-[#0A6E54]">Start free</Link>
        </div>
      </div>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, color: '#0C1F1A', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14.5, color: '#5E6B66' }}>
        {links.map(([label, href]) => (
          <Link key={label + href} href={href} className="transition-colors hover:text-[#0C8A68]">{label}</Link>
        ))}
      </div>
    </div>
  )
}

/** Public site footer — shared by the landing and every marketing sub-page. */
export function SiteFooter() {
  return (
    <div style={{ borderTop: '1px solid #E8E5DD', background: '#FBFAF7' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="max-md:!grid-cols-2">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
              <Mark size={30} />
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Propel</span>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, fontWeight: 300, color: '#8A938E', maxWidth: '30ch', margin: 0 }}>
              The AI-native CRM for outbound teams. propeltech.es
            </p>
          </div>
          <FooterCol title="Product" links={[['Features', '/#features'], ['Integrations', '/#connect'], ['Pricing', '/#pricing'], ['Security', '/#security']]} />
          <FooterCol title="Company" links={[['About', '/about'], ['Careers', '/careers'], ['Blog', '/blog'], ['Contact', '/contact']]} />
          <FooterCol title="Legal" links={[['Privacy', '/privacy'], ['Terms', '/terms'], ['GDPR', '/gdpr'], ['Security', '/#security']]} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, borderTop: '1px solid #E8E5DD', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ ...MONO, fontSize: 12, color: '#A6ABA4' }}>© 2026 Propel · propeltech.es</span>
          <span style={{ ...BODY, fontSize: 13, color: '#A6ABA4' }}>English · Español · Português · Français · Deutsch · Italiano</span>
        </div>
      </div>
    </div>
  )
}

/** Page wrapper: sticky nav + main content + shared footer. */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FBFAF7', color: '#0C1F1A', ...BODY }}>
      <MarketingNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

/** Standard page hero (eyebrow + headline + optional subtitle). */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 32px 40px' }}>
      <div style={{ ...DISPLAY, fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0C8A68', marginBottom: 16 }}>{eyebrow}</div>
      <h1 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(34px,5vw,58px)', letterSpacing: '-0.03em', lineHeight: 1.02, margin: '0 0 20px', maxWidth: '20ch' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 300, color: '#4A5852', maxWidth: '60ch', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

/** Constrained reading column for legal / long-form copy. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 32px 90px', fontSize: 16, lineHeight: 1.7, color: '#3F4D48', ...BODY }}>
      {children}
    </div>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: '#0C1F1A', margin: '40px 0 14px' }}>{children}</h2>
}

export function CtaRow({ note }: { note?: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <Link href="/register" style={{ ...DISPLAY, fontSize: 15, fontWeight: 600, color: '#fff', background: '#0C8A68', padding: '13px 26px', borderRadius: 10 }} className="transition-colors hover:!bg-[#0A6E54]">Start free</Link>
      <Link href="/contact" style={{ ...DISPLAY, fontSize: 15, fontWeight: 600, color: '#0C1F1A', background: '#fff', border: '1px solid #E8E5DD', padding: '13px 26px', borderRadius: 10 }} className="transition-colors hover:!border-[#0C8A68]">Talk to us</Link>
      {note && <span style={{ fontSize: 13.5, color: '#8A938E' }}>{note}</span>}
    </div>
  )
}

const CARD: CSSProperties = { background: '#fff', border: '1px solid #E8E5DD', borderRadius: 16, padding: 28 }
export function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={CARD}>
      <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 300, color: '#5E6B66', margin: 0 }}>{desc}</p>
    </div>
  )
}
