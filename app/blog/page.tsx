import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage, PageHero, DISPLAY, MONO } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'Blog · Propel',
  description: 'Playbooks, product updates, and ideas on outbound sales, AI in the CRM, and building a revenue engine — from the Propel team.',
}

const posts = [
  ['Why outbound CRMs need to be systems of action', 'Playbook', 'Jun 2026', '6 min', 'Reporting tools record the past. The next generation of CRM has to drive the next move — here is what that means in practice.'],
  ['Scoring leads with conformal abstention', 'AI', 'Jun 2026', '8 min', 'A practical look at how Propel ranks leads and, just as importantly, knows when to say "not sure" instead of guessing.'],
  ['The 5 sequences every outbound team should steal', 'Playbook', 'May 2026', '5 min', 'Battle-tested cadences for cold outreach, re-engagement, and post-demo follow-up — with timing and copy.'],
  ['Designing a CRM that respects EU data residency', 'Engineering', 'May 2026', '7 min', 'How we built multi-tenant isolation with Postgres row-level security and kept customer data inside the EU.'],
  ['Spend caps for AI in production', 'Engineering', 'Apr 2026', '6 min', 'Letting reps use AI freely without surprise bills: the architecture behind per-org and per-user spend limits.'],
  ['From spreadsheet to pipeline in an afternoon', 'Guide', 'Apr 2026', '4 min', 'A step-by-step import guide to get your contacts, deals, and history into Propel without the usual pain.'],
] as const

export default function BlogPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Blog"
        title="Ideas for teams that propel."
        subtitle="Playbooks, product notes, and engineering deep-dives on outbound sales and AI-native CRM."
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 32px 90px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 22 }} className="max-md:!grid-cols-1">
          {posts.map(([title, tag, date, read, excerpt]) => (
            <article key={title} style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ ...MONO, fontSize: 11, fontWeight: 600, color: '#0C8A68', background: '#EEFAF5', border: '1px solid #D6F2E8', borderRadius: 6, padding: '4px 9px' }}>{tag}</span>
                <span style={{ ...MONO, fontSize: 12, color: '#A6ABA4' }}>{date} · {read}</span>
              </div>
              <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 21, letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 10px' }}>{title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 300, color: '#5E6B66', margin: '0 0 18px', flex: 1 }}>{excerpt}</p>
              <span style={{ ...DISPLAY, fontSize: 14, fontWeight: 600, color: '#A6ABA4' }}>Coming soon</span>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 48, background: '#0C1F1A', borderRadius: 20, padding: '40px 36px', textAlign: 'center', color: '#FBFAF7' }}>
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', margin: '0 0 10px' }}>Get the playbooks in your inbox</h2>
          <p style={{ fontSize: 16, fontWeight: 300, color: '#9FB3AB', maxWidth: '46ch', margin: '0 auto 22px' }}>
            New articles on outbound and AI-native CRM, no more than twice a month.
          </p>
          <Link href="/contact" style={{ ...DISPLAY, fontSize: 15, fontWeight: 600, color: '#06231B', background: '#44C2A0', padding: '13px 28px', borderRadius: 11 }} className="transition-colors hover:!bg-[#7BE0BE]">Subscribe</Link>
        </div>
      </div>
    </MarketingPage>
  )
}
