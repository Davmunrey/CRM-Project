import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage, PageHero, DISPLAY, FeatureCard } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'Careers · Propel',
  description: 'Join Propel and help build the AI-native CRM for outbound teams. Remote-friendly across the EU, with open roles in engineering, design, and go-to-market.',
}

const perks = [
  ['Remote-first', 'Work from anywhere in the EU. We optimize for outcomes and deep work, not hours at a desk.'],
  ['Real ownership', 'Small team, high trust. You own problems end-to-end and ship to production weekly.'],
  ['Meaningful equity', 'Everyone is an owner. Competitive salary plus equity in an early-stage company.'],
  ['Learning budget', 'Annual budget for books, courses, and conferences — plus time to use it.'],
  ['Modern stack', 'Next.js, TypeScript, Supabase/Postgres, and AI tooling. No legacy baggage.'],
  ['Health & time off', 'Private health cover and a generous, genuinely-used vacation policy.'],
] as const

const roles = [
  ['Senior Full-Stack Engineer', 'Engineering', 'Remote · EU', 'Next.js + TypeScript + Postgres'],
  ['Product Designer', 'Design', 'Remote · EU', 'Own the product surface end-to-end'],
  ['Founding Account Executive', 'Go-to-market', 'Madrid / Remote', 'Sell the CRM built for sellers'],
  ['Developer Advocate', 'Go-to-market', 'Remote · EU', 'Docs, demos, and community'],
] as const

export default function CareersPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Careers"
        title="Build the CRM sellers actually love."
        subtitle="We are a small, senior team shipping fast. If you want real ownership, a modern stack, and a product with strong opinions, we should talk."
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 24px' }}>
        <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(24px,3.2vw,34px)', letterSpacing: '-0.02em', margin: '0 0 24px' }}>Why Propel</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }} className="max-md:!grid-cols-1">
          {perks.map(([title, desc]) => <FeatureCard key={title} title={title} desc={desc} />)}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 90px' }}>
        <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(24px,3.2vw,34px)', letterSpacing: '-0.02em', margin: '0 0 24px' }}>Open roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {roles.map(([title, team, location, detail]) => (
            <a
              key={title}
              href={`mailto:careers@propeltech.es?subject=${encodeURIComponent('Application: ' + title)}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: '#fff', border: '1px solid #E8E5DD', borderRadius: 14, padding: '22px 26px', textDecoration: 'none', color: '#0C1F1A', flexWrap: 'wrap' }}
              className="transition-colors hover:!border-[#0C8A68]"
            >
              <div>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 18 }}>{title}</div>
                <div style={{ fontSize: 14, color: '#5E6B66', marginTop: 4 }}>{team} · {location} · {detail}</div>
              </div>
              <span style={{ ...DISPLAY, fontSize: 14.5, fontWeight: 600, color: '#0C8A68' }}>Apply →</span>
            </a>
          ))}
        </div>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: '#5E6B66', marginTop: 28 }}>
          Don&rsquo;t see your role? We are always glad to meet exceptional people. Email{' '}
          <Link href="mailto:careers@propeltech.es" style={{ color: '#0C8A68', fontWeight: 600 }}>careers@propeltech.es</Link>{' '}
          with what you&rsquo;d want to own.
        </p>
      </div>
    </MarketingPage>
  )
}
