'use client'

import Link from 'next/link'
import { SiteFooter } from '@/components/marketing/chrome'

/**
 * Propel marketing landing — implements the "Propel Landing" brand design
 * (Schibsted Grotesk display · Hanken Grotesk body · JetBrains Mono labels;
 * cream paper #FBFAF7 with ink #0C1F1A sections and propel-green accents).
 */

const DISPLAY = { fontFamily: 'var(--font-display), sans-serif' } as const
const MONO = { fontFamily: 'var(--font-mono), monospace' } as const
const BODY = { fontFamily: 'var(--font-hanken), sans-serif' } as const

/** Double-chevron "fast-forward" mark. */
function Mark({
  size = 30,
  badge = '#0C8A68',
  lead = '#fff',
  echo = '#9BE8CE',
  echoOpacity = 1,
  showEcho = true,
}: {
  size?: number
  badge?: string
  lead?: string
  echo?: string
  echoOpacity?: number
  showEcho?: boolean
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" fill={badge} />
      <path d="M12 13 L20 20 L12 27" stroke={lead} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      {showEcho && (
        <path
          d="M20 13 L28 20 L20 27"
          stroke={echo}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={echoOpacity}
        />
      )}
    </svg>
  )
}

const navLinks = [
  ['Product', '#product'],
  ['Features', '#features'],
  ['Integrations', '#connect'],
  ['Security', '#security'],
  ['Pricing', '#pricing'],
] as const

export function PropelLanding() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#FBFAF7', color: '#0C1F1A', ...BODY }}>
      {/* NAV */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(14px)',
          background: 'rgba(251,250,247,0.82)',
          borderBottom: '1px solid #E8E5DD',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '15px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Mark size={30} />
            <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>Propel</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 30,
              ...DISPLAY,
              fontSize: 14.5,
              fontWeight: 500,
              color: '#3F4D48',
            }}
            className="max-md:hidden"
          >
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-[#0C8A68]">
                {label}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/login" style={{ ...DISPLAY, fontSize: 14.5, fontWeight: 600, color: '#0C1F1A' }}>
              Sign in
            </Link>
            <Link
              href="/register"
              style={{
                ...DISPLAY,
                fontSize: 14.5,
                fontWeight: 600,
                color: '#fff',
                background: '#0C8A68',
                padding: '10px 18px',
                borderRadius: 9,
              }}
              className="transition-colors hover:!bg-[#0A6E54]"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px 70px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 15px',
            borderRadius: 999,
            background: '#EEFAF5',
            border: '1px solid #D6F2E8',
            ...DISPLAY,
            fontSize: 13,
            fontWeight: 600,
            color: '#0A6E54',
            marginBottom: 30,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0C8A68', display: 'inline-block' }} />
          New — a tool-using AI sales assistant over your own data
        </div>
        <h1
          style={{
            ...DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(44px,7.4vw,92px)',
            lineHeight: 0.96,
            letterSpacing: '-0.035em',
            margin: '0 auto 28px',
            maxWidth: '16ch',
          }}
        >
          Propel every deal forward.
        </h1>
        <p
          style={{
            fontSize: 'clamp(18px,2.1vw,22px)',
            lineHeight: 1.55,
            fontWeight: 300,
            color: '#4A5852',
            maxWidth: '60ch',
            margin: '0 auto 38px',
          }}
        >
          Propel is the AI-native CRM for outbound teams. Contacts, deals, pipelines, sequences, Gmail &amp;
          Calendar — plus an assistant that reads your pipeline and tells you the next best move.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <Link
            href="/register"
            style={{
              ...DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              background: '#0C8A68',
              padding: '15px 28px',
              borderRadius: 11,
            }}
            className="transition-colors hover:!bg-[#0A6E54]"
          >
            Start free — no card
          </Link>
          <Link
            href="/contact"
            style={{
              ...DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              color: '#0C1F1A',
              background: '#fff',
              border: '1px solid #E8E5DD',
              padding: '15px 28px',
              borderRadius: 11,
            }}
            className="transition-colors hover:!border-[#0C8A68]"
          >
            Book a demo
          </Link>
        </div>
        <div style={{ ...BODY, fontSize: 14, color: '#8A938E' }}>
          Free Gemini AI by default · 6 languages · SSO &amp; SCIM ready
        </div>
      </div>

      {/* PRODUCT VISUAL */}
      <div id="product" style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 30px' }}>
        <div
          style={{
            borderRadius: 20,
            border: '1px solid #E8E5DD',
            background: '#fff',
            boxShadow: '0 40px 90px -40px rgba(12,31,26,0.4)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 18px',
              borderBottom: '1px solid #EFEDE7',
              background: '#FBFAF7',
            }}
          >
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E6E2D9' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E6E2D9' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E6E2D9' }} />
            <div
              style={{
                marginLeft: 14,
                ...MONO,
                fontSize: 12,
                color: '#A6ABA4',
                background: '#fff',
                border: '1px solid #EFEDE7',
                borderRadius: 7,
                padding: '4px 12px',
              }}
            >
              app.propeltech.es/deals
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr' }} className="max-md:!grid-cols-1">
            <div style={{ background: '#0C1F1A', padding: '20px 14px', minHeight: 430 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 8px 18px' }}>
                <Mark size={24} badge="#11A57E" lead="#06231B" showEcho={false} />
                <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, color: '#FBFAF7' }}>Propel</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, ...DISPLAY, fontSize: 13.5, fontWeight: 500 }}>
                {['Dashboard', 'Contacts'].map((i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: 8, color: '#8FA39B' }}>
                    {i}
                  </div>
                ))}
                <div style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(17,165,126,0.16)', color: '#FBFAF7' }}>
                  Deals
                </div>
                {['Inbox', 'Sequences', 'Reports'].map((i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: 8, color: '#8FA39B' }}>
                    {i}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 11,
                  background: 'rgba(255,106,69,0.12)',
                  border: '1px solid rgba(255,106,69,0.28)',
                }}
              >
                <div style={{ ...DISPLAY, fontSize: 12, fontWeight: 700, color: '#FF8B6B', marginBottom: 5 }}>
                  AI · Next best action
                </div>
                <div style={{ ...BODY, fontSize: 12, lineHeight: 1.4, color: '#C9D6D0' }}>
                  Follow up with Northwind — idle 6 days.
                </div>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 20 }}>Pipeline</div>
                <div style={{ display: 'flex', gap: 8, ...DISPLAY, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ padding: '6px 12px', borderRadius: 7, background: '#0C8A68', color: '#fff' }}>Kanban</span>
                  <span style={{ padding: '6px 12px', borderRadius: 7, color: '#5E6B66' }}>List</span>
                  <span style={{ padding: '6px 12px', borderRadius: 7, color: '#5E6B66' }}>Timeline</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {/* QUALIFIED */}
                <div>
                  <ColHead label="QUALIFIED" count="3" />
                  <DealCard name="Acme Corp" amount="$24,000" />
                  <DealCard name="Vertex Ltd" amount="$9,500" last />
                </div>
                {/* PROPOSAL */}
                <div>
                  <ColHead label="PROPOSAL" count="2" />
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #D6F2E8',
                      borderRadius: 11,
                      padding: 13,
                      marginBottom: 9,
                      boxShadow: '0 6px 18px -10px rgba(12,138,104,0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ ...DISPLAY, fontWeight: 600, fontSize: 13.5 }}>Northwind</span>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6A45' }} />
                    </div>
                    <div style={{ ...MONO, fontSize: 13, color: '#0C8A68', fontWeight: 600 }}>$48,200</div>
                  </div>
                  <DealCard name="Lumen Inc" amount="$15,750" last />
                </div>
                {/* WON */}
                <div>
                  <ColHead label="WON" count="1" />
                  <div style={{ background: '#EEFAF5', border: '1px solid #D6F2E8', borderRadius: 11, padding: 13 }}>
                    <div style={{ ...DISPLAY, fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>Orbital Co</div>
                    <div style={{ ...MONO, fontSize: 13, color: '#0C8A68', fontWeight: 600 }}>$62,000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGO MARQUEE */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px 70px' }}>
        <div
          style={{
            textAlign: 'center',
            ...DISPLAY,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: '#A6ABA4',
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          Trusted by outbound teams everywhere
        </div>
        <div
          style={{
            overflow: 'hidden',
            WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
            maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 64,
              width: 'max-content',
              animation: 'pmarquee 30s linear infinite',
              ...DISPLAY,
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: '-0.02em',
              color: '#C2C7BF',
            }}
          >
            {[...Array(2)].flatMap((_, k) =>
              ['Northwind', 'Vertex', 'Lumen', 'Orbital', 'Acme Corp', 'Helios', 'Cobalt', 'Meridian'].map((n) => (
                <span key={`${k}-${n}`}>{n}</span>
              )),
            )}
          </div>
        </div>
      </div>

      {/* STATS BAND */}
      <div style={{ background: '#0C1F1A', color: '#FBFAF7' }}>
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '70px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 24,
            textAlign: 'center',
          }}
          className="max-md:!grid-cols-2"
        >
          {[
            ['18.5×', 'faster on warm leads'],
            ['6', 'languages, fully localized'],
            ['0', 'known vulnerabilities'],
            ['3', 'AI providers, your choice'],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(36px,4.4vw,56px)', letterSpacing: '-0.03em', color: '#44C2A0' }}>
                {n}
              </div>
              <div style={{ ...BODY, fontSize: 15, fontWeight: 300, color: '#9FB3AB', marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px 30px' }}>
        <div style={{ textAlign: 'center', maxWidth: '62ch', margin: '0 auto 70px' }}>
          <Eyebrow>What Propel does</Eyebrow>
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(32px,4.6vw,54px)', letterSpacing: '-0.03em', lineHeight: 1.02, margin: 0 }}>
            Everything outbound, in one place.
          </h2>
        </div>

        {/* feature 1 */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'center', padding: '30px 0 70px' }}
          className="max-md:!grid-cols-1 max-md:!gap-10"
        >
          <div>
            <div style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 12, background: '#FFF1ED', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6A45" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v1H8a3 3 0 0 0-3 3 3 3 0 0 0 0 6 3 3 0 0 0 3 3h1v1a3 3 0 0 0 6 0v-1h1a3 3 0 0 0 3-3 3 3 0 0 0 0-6 3 3 0 0 0-3-3h-1V5a3 3 0 0 0-3-3z" />
              </svg>
            </div>
            <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em', lineHeight: 1.08, margin: '0 0 16px' }}>
              An AI assistant that knows your pipeline.
            </h3>
            <p style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 300, color: '#4A5852', margin: '0 0 22px' }}>
              A tool-using agent over your <strong style={{ fontWeight: 600, color: '#0C1F1A' }}>own</strong> data — it
              searches contacts and deals, drafts replies, surfaces the next best action and logs activity. Gemini free
              by default, or bring OpenAI or Anthropic.
            </p>
            <FeatureList
              items={[
                'Inbox summarize & one-click draft reply',
                'Next-best-action on every contact & deal',
                'Per-tenant kill switch & spend caps',
              ]}
            />
          </div>
          <div style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 18, padding: 24, boxShadow: '0 30px 70px -45px rgba(12,31,26,0.4)' }}>
            <div style={{ display: 'flex', gap: 11, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0C8A68', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                  <path d="M12 13 L20 20 L12 27" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 14, paddingTop: 6 }}>Propel Assistant</div>
            </div>
            <div style={{ background: '#FBFAF7', border: '1px solid #EFEDE7', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.5, color: '#3F4D48', marginBottom: 11 }}>
              Who are my hottest deals going stale?
            </div>
            <div style={{ background: '#EEFAF5', border: '1px solid #D6F2E8', borderRadius: 12, padding: '14px 16px', fontSize: 14.5, lineHeight: 1.55, color: '#0C1F1A' }}>
              <strong style={{ fontWeight: 600 }}>Northwind</strong> ($48.2k) has had no activity for 6 days and sits in
              Proposal. Want me to draft a check-in to Sarah and schedule a call?
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
              <span style={{ ...DISPLAY, fontSize: 12.5, fontWeight: 600, color: '#fff', background: '#0C8A68', padding: '8px 14px', borderRadius: 8 }}>Draft it</span>
              <span style={{ ...DISPLAY, fontSize: 12.5, fontWeight: 600, color: '#5E6B66', background: '#fff', border: '1px solid #E8E5DD', padding: '8px 14px', borderRadius: 8 }}>Schedule call</span>
            </div>
          </div>
        </div>

        {/* feature 2 (reverse) */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'center', padding: '30px 0 70px' }}
          className="max-md:!grid-cols-1 max-md:!gap-10"
        >
          <div style={{ background: '#0C1F1A', borderRadius: 18, padding: 28 }}>
            <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 13, color: '#7BE0BE', letterSpacing: '0.04em', marginBottom: 18 }}>
              DEAL BOARD · TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <GanttRow name="Acme" bar={{ width: '62%', background: 'linear-gradient(90deg,#11A57E,#44C2A0)' }} />
              <GanttRow name="Northwind" bar={{ width: '48%', marginLeft: '30%', background: 'linear-gradient(90deg,#FF6A45,#FF8B6B)' }} />
              <GanttRow name="Lumen" bar={{ width: '62%', marginLeft: '18%', background: 'rgba(255,255,255,0.18)' }} />
              <GanttRow name="Orbital" bar={{ width: '34%', marginLeft: '55%', background: 'linear-gradient(90deg,#11A57E,#44C2A0)' }} />
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
              <MiniStat value="$159k" label="weighted forecast" color="#44C2A0" />
              <MiniStat value="2" label="rotting deals" color="#FF8B6B" />
            </div>
          </div>
          <div>
            <div style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 12, background: '#D6F2E8', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C8A68" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="3" x2="3" y2="21" />
                <rect x="7" y="6" width="6" height="4" rx="1" />
                <rect x="7" y="14" width="11" height="4" rx="1" />
              </svg>
            </div>
            <h3 style={{ ...DISPLAY, fontWeight: 700, fontSize: 32, letterSpacing: '-0.025em', lineHeight: 1.08, margin: '0 0 16px' }}>
              Pipelines that flag what&rsquo;s slipping.
            </h3>
            <p style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 300, color: '#4A5852', margin: '0 0 22px' }}>
              Multi-pipeline deals across Kanban, List, Calendar and Timeline (Gantt). Propel marks idle and
              &ldquo;rotting&rdquo; deals, warns when there&rsquo;s no next activity, and scores deal health — so nothing
              stalls quietly.
            </p>
            <FeatureList
              items={[
                'Quote builder — save, export & email',
                'Weighted forecast & deal-health scoring',
                'A/B email sequences & lead scoring',
              ]}
            />
          </div>
        </div>

        {/* feature 3: 3-up grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, padding: '30px 0 0' }} className="max-md:!grid-cols-1">
          <MiniFeature title="Inbox & Calendar" desc="Native Gmail thread sync, send & reply, plus Google Calendar with Meet links — right beside the record.">
            <path d="M2 4h20v16H2z" fill="none" />
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 5L2 7" />
          </MiniFeature>
          <MiniFeature title="No-code automations" desc="A recipe center with a when → then builder and template library. Web-to-lead forms and booking links included.">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </MiniFeature>
          <MiniFeature title="Help desk & tickets" desc="A status-filtered support queue with priority and assignee — CRM and service in one workspace.">
            <path d="M14 9V5a3 3 0 0 0-6 0v4" />
            <rect x="4" y="9" width="16" height="11" rx="2" />
          </MiniFeature>
        </div>
      </div>

      {/* INTEGRATIONS */}
      <div id="connect" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
        <div style={{ background: '#FBFAF7', border: '1px solid #E8E5DD', borderRadius: 24, padding: 60, textAlign: 'center' }} className="max-md:!p-8">
          <Eyebrow>Connected</Eyebrow>
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(28px,3.8vw,42px)', letterSpacing: '-0.025em', margin: '0 0 16px' }}>
            Plug Propel into your stack.
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.55, fontWeight: 300, color: '#4A5852', maxWidth: '54ch', margin: '0 auto 44px' }}>
            Gmail &amp; Calendar, Slack, Stripe, LinkedIn, signed webhooks and a scoped public API — connect in a few
            clicks, fully managed.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {['Gmail', 'Google Calendar', 'Slack', 'Stripe', 'LinkedIn', 'Webhooks', 'Public API', 'Gemini · OpenAI · Anthropic'].map((n) => (
              <span
                key={n}
                style={{ ...DISPLAY, fontSize: 15, fontWeight: 600, color: '#0C1F1A', background: '#fff', border: '1px solid #E8E5DD', padding: '12px 22px', borderRadius: 11 }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SECURITY */}
      <div id="security" style={{ background: '#0C1F1A', color: '#FBFAF7' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'center' }} className="max-md:!grid-cols-1 max-md:!gap-10">
            <div>
              <div style={{ ...DISPLAY, fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#44C2A0', marginBottom: 16 }}>
                Enterprise-secure
              </div>
              <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(30px,4vw,48px)', letterSpacing: '-0.03em', lineHeight: 1.03, margin: '0 0 20px' }}>
                Built for revenue teams and compliance officers.
              </h2>
              <p style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 300, color: '#9FB3AB', margin: 0 }}>
                True multi-tenant isolation, server-side RBAC, MFA, AES-256 field encryption, GDPR export &amp; erasure,
                and a tamper-evident audit log. SSO (OIDC) and SCIM 2.0 ready for Entra, Okta and OneLogin.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <SecCard title="MFA · TOTP" desc="RFC-6238, login to settings" />
              <SecCard title="RBAC" desc="Server-side, 5 roles" />
              <SecCard title="AES-256-GCM" desc="Field-level encryption" />
              <SecCard title="GDPR" desc="Export & erasure" />
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(32px,4.6vw,54px)', letterSpacing: '-0.03em', margin: 0 }}>
            Start free. Scale when you win.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, alignItems: 'start' }} className="max-md:!grid-cols-1">
          {/* Starter */}
          <div style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 18, padding: 34 }}>
            <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Starter</div>
            <p style={{ fontSize: 14.5, color: '#8A938E', fontWeight: 300, margin: '0 0 22px' }}>
              For small teams getting off spreadsheets.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 46, letterSpacing: '-0.03em' }}>€0</span>
              <span style={{ ...BODY, fontSize: 15, color: '#8A938E' }}>/ user / mo</span>
            </div>
            <PriceCta label="Start free" variant="light" />
            <CheckList color="#0C8A68" textColor="#3F4D48" items={['Contacts, companies & deals', 'Gmail & Calendar sync', 'Free Gemini AI assistant']} />
          </div>
          {/* Growth */}
          <div style={{ background: '#0C1F1A', color: '#FBFAF7', borderRadius: 18, padding: 34, position: 'relative', boxShadow: '0 40px 80px -40px rgba(12,31,26,0.5)' }}>
            <div style={{ position: 'absolute', top: -12, left: 34, ...DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#06231B', background: '#44C2A0', padding: '5px 12px', borderRadius: 999 }}>
              MOST POPULAR
            </div>
            <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Growth</div>
            <p style={{ fontSize: 14.5, color: '#9FB3AB', fontWeight: 300, margin: '0 0 22px' }}>
              For outbound teams scaling pipeline.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 46, letterSpacing: '-0.03em', color: '#FBFAF7' }}>€29</span>
              <span style={{ ...BODY, fontSize: 15, color: '#9FB3AB' }}>/ user / mo</span>
            </div>
            <PriceCta label="Start 14-day trial" variant="green" />
            <CheckList
              color="#44C2A0"
              textColor="#C9D6D0"
              items={['Everything in Starter', 'Sequences, automations & forecast', 'Multi-provider AI & spend caps', 'Help desk & booking links']}
            />
          </div>
          {/* Enterprise */}
          <div style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 18, padding: 34 }}>
            <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Enterprise</div>
            <p style={{ fontSize: 14.5, color: '#8A938E', fontWeight: 300, margin: '0 0 22px' }}>
              For security-led, multi-team orgs.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
              <span style={{ ...DISPLAY, fontWeight: 700, fontSize: 46, letterSpacing: '-0.03em' }}>Custom</span>
            </div>
            <PriceCta label="Talk to sales" variant="light" />
            <CheckList color="#0C8A68" textColor="#3F4D48" items={['SSO (OIDC) & SCIM 2.0', 'Audit log & GDPR DSAR', 'Dedicated support & SLA']} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 100px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: '#0C1F1A', color: '#FBFAF7', padding: '80px 60px', textAlign: 'center' }} className="max-md:!px-7">
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(700px 400px at 80% -20%, rgba(17,165,126,0.32), transparent 60%), radial-gradient(500px 320px at 0% 130%, rgba(255,106,69,0.18), transparent 60%)',
            }}
          />
          <div style={{ position: 'relative' }}>
            <h2 style={{ ...DISPLAY, fontWeight: 700, fontSize: 'clamp(32px,5vw,60px)', letterSpacing: '-0.03em', lineHeight: 1.0, margin: '0 auto 22px', maxWidth: '18ch' }}>
              Your next big account is already in your pipeline.
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 300, color: '#9FB3AB', maxWidth: '48ch', margin: '0 auto 36px' }}>
              Propel surfaces it — and tells you exactly what to do next.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: '#06231B', background: '#44C2A0', padding: '15px 30px', borderRadius: 11 }} className="transition-colors hover:!bg-[#7BE0BE]">
                Start free
              </Link>
              <Link href="/contact" style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: '#FBFAF7', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', padding: '15px 30px', borderRadius: 11 }}>
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  )
}

/* ---------- small building blocks ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...DISPLAY, fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0C8A68', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function ColHead({ label, count }: { label: string; count: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', ...DISPLAY, fontSize: 12, fontWeight: 700, color: '#5E6B66', marginBottom: 9 }}>
      <span>{label}</span>
      <span style={{ color: '#A6ABA4' }}>{count}</span>
    </div>
  )
}

function DealCard({ name, amount, last }: { name: string; amount: string; last?: boolean }) {
  return (
    <div style={{ background: '#FBFAF7', border: '1px solid #EFEDE7', borderRadius: 11, padding: 13, marginBottom: last ? 0 : 9 }}>
      <div style={{ ...DISPLAY, fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>{name}</div>
      <div style={{ ...MONO, fontSize: 13, color: '#0C8A68', fontWeight: 600 }}>{amount}</div>
    </div>
  )
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 16, color: '#3F4D48' }}>
      {items.map((i) => (
        <li key={i} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <span style={{ color: '#0C8A68', fontWeight: 700 }}>→</span> {i}
        </li>
      ))}
    </ul>
  )
}

function GanttRow({ name, bar }: { name: string; bar: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ ...BODY, fontSize: 12.5, color: '#9FB3AB', width: 70 }}>{name}</span>
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, borderRadius: 7, ...bar }} />
      </div>
    </div>
  )
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 11, padding: 14 }}>
      <div style={{ ...MONO, fontSize: 20, color, fontWeight: 600 }}>{value}</div>
      <div style={{ ...BODY, fontSize: 12, color: '#9FB3AB', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function MiniFeature({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 16, padding: 30 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: '#EEFAF5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0C8A68" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </svg>
      </div>
      <h4 style={{ ...DISPLAY, fontWeight: 700, fontSize: 19, margin: '0 0 8px' }}>{title}</h4>
      <p style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 300, color: '#5E6B66', margin: 0 }}>{desc}</p>
    </div>
  )
}

function SecCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 22 }}>
      <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 15, color: '#FBFAF7', marginBottom: 6 }}>{title}</div>
      <div style={{ ...BODY, fontSize: 13.5, fontWeight: 300, color: '#8FA39B' }}>{desc}</div>
    </div>
  )
}

function PriceCta({ label, variant }: { label: string; variant: 'light' | 'green' }) {
  const base: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    ...DISPLAY,
    fontSize: 15,
    fontWeight: 600,
    padding: 13,
    borderRadius: 10,
    marginBottom: 24,
  }
  const style =
    variant === 'green'
      ? { ...base, color: '#fff', background: '#0C8A68' }
      : { ...base, color: '#0C1F1A', background: '#fff', border: '1px solid #E8E5DD' }
  return (
    <Link href="/register" style={style} className={variant === 'green' ? 'transition-colors hover:!bg-[#11A57E]' : 'transition-colors hover:!border-[#0C8A68]'}>
      {label}
    </Link>
  )
}

function CheckList({ items, color, textColor }: { items: string[]; color: string; textColor: string }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 14.5, color: textColor }}>
      {items.map((i) => (
        <li key={i} style={{ display: 'flex', gap: 10 }}>
          <span style={{ color, fontWeight: 700 }}>✓</span> {i}
        </li>
      ))}
    </ul>
  )
}

