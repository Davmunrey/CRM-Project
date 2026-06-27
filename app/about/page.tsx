import type { Metadata } from 'next'
import { MarketingPage, PageHero, DISPLAY, MONO, FeatureCard, CtaRow } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'About · Propel',
  description: 'Propel is the AI-native CRM built for outbound sales teams. Learn our mission, story, and the principles behind the product.',
}

const stats = [
  ['2025', 'Founded in Madrid'],
  ['6', 'Languages supported'],
  ['100%', 'Outbound-native'],
  ['EU', 'Data residency'],
] as const

const values = [
  ['Outbound-native, not bolted-on', 'Most CRMs were built for inbound and pipeline reporting. Propel is designed from the ground up for teams that prospect, sequence, and close — every screen assumes you are reaching out, not waiting.'],
  ['AI that does the work', 'AI should draft the email, score the lead, and tell you the next move — not just summarize what already happened. We ship assistive AI with spend caps you control.'],
  ['Your data is yours', 'EU data residency, row-level tenant isolation, and no training on your customer data. Security and privacy are defaults, not upsells.'],
  ['Speed is a feature', 'A CRM you dread is a CRM you avoid. We obsess over keystrokes, latency, and the command palette so reps stay in flow.'],
] as const

export default function AboutPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="About Propel"
        title="The CRM that pushes deals forward."
        subtitle="Propel is an AI-native CRM for outbound teams — contacts, deals, sequences, and an assistant that tells you exactly what to do next. We are building the system of action for revenue teams, not just another system of record."
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }} className="max-md:!grid-cols-2">
          {stats.map(([value, label]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 16, padding: 24 }}>
              <div style={{ ...MONO, fontSize: 28, fontWeight: 600, color: '#0C8A68' }}>{value}</div>
              <div style={{ fontSize: 13.5, color: '#5E6B66', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 24px' }}>
        <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,38px)', letterSpacing: '-0.02em', margin: '0 0 28px' }}>What we believe</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }} className="max-md:!grid-cols-1">
          {values.map(([title, desc]) => <FeatureCard key={title} title={title} desc={desc} />)}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 90px' }}>
        <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,3.5vw,38px)', letterSpacing: '-0.02em', margin: '0 0 16px' }}>Our story</h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, fontWeight: 300, color: '#3F4D48' }}>
          Propel started with a simple frustration: the best outbound reps were spending more time feeding the CRM than talking to customers. Pipelines were tidy, but deals still slipped — because the tool recorded the past instead of driving the next action.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.7, fontWeight: 300, color: '#3F4D48' }}>
          So we built the CRM we wanted to use: fast, opinionated, and AI-native. Propel surfaces the account most likely to close, drafts the follow-up, and keeps the whole team moving — with security and EU data residency built in from day one.
        </p>
        <div style={{ marginTop: 28 }}><CtaRow note="No credit card required" /></div>
      </div>
    </MarketingPage>
  )
}
