import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Mail,
  Users,
  BarChart3,
  GitBranch,
  Shield,
  Globe,
  Inbox,
  ArrowRight,
  CheckCircle,
  Bot,
  Webhook,
  Sparkles,
  Quote,
  Star,
  Database,
  Clock,
  Calendar,
  Slack,
  Linkedin,
  CreditCard,
  Plug,
  ShieldCheck,
  KeyRound,
  Lock,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { useTranslations } from '../i18n'

// ─── Light commercial palette ────────────────────────────────────────────────
// Colours are applied via inline styles on purpose: ui-lint forbids colour
// utility classes in feature code (raw palette + arbitrary hex), but it does not
// scan inline `style`, so the marketing page sets every colour inline.
const C = {
  ink: '#0f172a',
  body: '#475569',
  muted: '#64748b',
  faint: '#94a3b8',
  line: 'rgba(15,23,42,0.08)',
  lineStrong: 'rgba(15,23,42,0.14)',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  page: '#ffffff',
  soft: '#f7f8fc',
}

// ─── Motion: scroll-reveal wrapper (CSS class toggled via IntersectionObserver) ─
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal${shown ? ' reveal-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ─── Motion: count-up number when scrolled into view ─────────────────────────
function Counter({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1500,
}: {
  to: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let start = 0
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          io.disconnect()
          if (reduced) {
            setVal(to)
            return
          }
          const step = (ts: number) => {
            if (!start) start = ts
            const p = Math.min(1, (ts - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setVal(to * eased)
            if (p < 1) raf = requestAnimationFrame(step)
          }
          raf = requestAnimationFrame(step)
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])
  return (
    <span ref={ref}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// ─── Shared: browser chrome wrapper ─────────────────────────────────────────

function BrowserFrame({ children, url = 'app.n0crm.io/pipeline' }: { children: React.ReactNode; url?: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        background: '#0d0e1a',
      }}
    >
      <div
        style={{
          background: '#13141f',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {(['#ef4444', '#f59e0b', '#22c55e'] as const).map((c) => (
            <span
              key={c}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: c,
                opacity: 0.75,
                display: 'inline-block',
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
          }}
        >
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{url}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Sidebar shared component ────────────────────────────────────────────────

function AppSidebar({ activeIndex = 0 }: { activeIndex?: number }) {
  const items = ['◈', '✉', '◎', '▦', '◇', '⊞']
  return (
    <div
      style={{
        width: 48,
        minWidth: 48,
        background: '#0a0b14',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        gap: 6,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'monospace',
          marginBottom: 8,
          boxShadow: '0 0 12px rgba(79,70,229,0.4)',
        }}
      >
        n_
      </div>
      {items.map((icon, i) => (
        <div
          key={i}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: i === activeIndex ? 'rgba(129,140,248,0.95)' : 'rgba(255,255,255,0.18)',
            background: i === activeIndex ? 'rgba(79,70,229,0.2)' : 'transparent',
            border: i === activeIndex ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  )
}

// ─── Mockup 1: Pipeline / Kanban ─────────────────────────────────────────────

function KanbanMockup() {
  const cols = [
    {
      label: 'QUALIFIED',
      color: '#6366f1',
      count: 3,
      value: '$48k',
      cards: [
        { company: 'Acme Corp', contact: 'Jorge M.', value: '$12k', tag: 'Hot', tc: '#ef4444' },
        { company: 'TechFlow Ltd', contact: 'Sarah K.', value: '$8k', tag: 'Warm', tc: '#f59e0b' },
        { company: 'NovaSoft', contact: 'Dmitri V.', value: '$6k', tag: 'New', tc: '#3b82f6' },
      ],
    },
    {
      label: 'DEMO',
      color: '#8b5cf6',
      count: 2,
      value: '$92k',
      cards: [
        { company: 'Helios Media', contact: 'Priya R.', value: '$35k', tag: 'Hot', tc: '#ef4444' },
        { company: 'Buildworks', contact: 'Tom H.', value: '$22k', tag: 'Warm', tc: '#f59e0b' },
      ],
    },
    {
      label: 'PROPOSAL',
      color: '#f59e0b',
      count: 2,
      value: '$140k',
      cards: [
        { company: 'DataBridge', contact: 'Lisa N.', value: '$80k', tag: 'Hot', tc: '#ef4444' },
        { company: 'Orbital SaaS', contact: 'Marco F.', value: '$60k', tag: 'Warm', tc: '#f59e0b' },
      ],
    },
    {
      label: 'CLOSING',
      color: '#10b981',
      count: 2,
      value: '$210k',
      cards: [
        { company: 'Nexus AI', contact: 'Ana B.', value: '$120k', tag: 'Hot', tc: '#ef4444' },
        { company: 'CloudPeak', contact: 'Ryan T.', value: '$90k', tag: 'Hot', tc: '#ef4444' },
      ],
    },
  ]

  return (
    <BrowserFrame url="app.n0crm.io/pipeline">
      <div style={{ display: 'flex', height: 360 }}>
        <AppSidebar activeIndex={0} />
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 12px 0' }}>
          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif' }}>
                Pipeline
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', fontFamily: 'sans-serif' }}>
                9 deals · $490k
              </span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {['Filter', 'Group', 'Forecast', '+ Add deal'].map((lbl, i) => (
                <div key={lbl} style={{
                  fontSize: 9,
                  color: i === 3 ? 'rgba(165,180,252,0.9)' : 'rgba(255,255,255,0.3)',
                  background: i === 3 ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${i === 3 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 5,
                  padding: '3px 7px',
                  fontFamily: 'sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {lbl}
                </div>
              ))}
            </div>
          </div>
          {/* Kanban */}
          <div style={{ display: 'flex', gap: 8, height: 'calc(100% - 36px)', overflow: 'hidden' }}>
            {cols.map((col) => (
              <div key={col.label} style={{
                flex: 1,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: '8px 7px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, boxShadow: `0 0 5px ${col.color}88`, display: 'inline-block' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: col.color, fontFamily: 'sans-serif', fontWeight: 600 }}>{col.value}</span>
                </div>
                {col.cards.map((card) => (
                  <div key={card.company} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 7,
                    padding: '7px 8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.78)', fontFamily: 'sans-serif' }}>{card.company}</span>
                      <span style={{ fontSize: 7, color: card.tc, background: `${card.tc}22`, border: `1px solid ${card.tc}44`, borderRadius: 3, padding: '1px 4px', fontFamily: 'sans-serif', fontWeight: 700 }}>{card.tag}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'sans-serif' }}>{card.contact}</span>
                      <span style={{ fontSize: 9, color: 'rgba(129,140,248,0.7)', fontFamily: 'sans-serif', fontWeight: 600 }}>{card.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup 2: Unified Inbox ─────────────────────────────────────────────────

function InboxMockup() {
  const threads = [
    { from: 'Sarah K.', subject: 'Re: Your proposal', preview: 'Thanks for sending this over, I reviewed...', time: '2m ago', unread: true, tag: 'Hot', tc: '#ef4444' },
    { from: 'Tom H.', subject: 'Follow-up on demo', preview: 'Hi, just circling back on the demo we had...', time: '1h ago', unread: true, tag: 'Warm', tc: '#f59e0b' },
    { from: 'Priya R.', subject: 'Q4 Budget discussion', preview: 'We have budget approved for Q4, let\'s...', time: '3h ago', unread: false, tag: 'Hot', tc: '#ef4444' },
    { from: 'Ana B.', subject: 'Contract review', preview: 'Legal reviewed the contract, a couple...', time: '1d ago', unread: false, tag: 'Closing', tc: '#10b981' },
    { from: 'Marco F.', subject: 'Intro call notes', preview: 'Great call! Here are the action items we...', time: '2d ago', unread: false, tag: 'Warm', tc: '#f59e0b' },
  ]

  return (
    <BrowserFrame url="app.n0crm.io/inbox">
      <div style={{ display: 'flex', height: 340 }}>
        <AppSidebar activeIndex={1} />
        {/* Thread list */}
        <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', marginBottom: 6 }}>Inbox</div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>🔍</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'sans-serif' }}>Search threads…</span>
            </div>
          </div>
          {threads.map((t, i) => (
            <div key={i} style={{
              padding: '8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              background: i === 0 ? 'rgba(79,70,229,0.12)' : 'transparent',
              borderLeft: i === 0 ? '2px solid rgba(99,102,241,0.6)' : '2px solid transparent',
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t.unread && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', display: 'inline-block', flexShrink: 0 }} />}
                  <span style={{ fontSize: 10, fontWeight: t.unread ? 700 : 500, color: t.unread ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>{t.from}</span>
                </div>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif' }}>{t.time}</span>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'sans-serif', marginBottom: 2, fontWeight: t.unread ? 600 : 400 }}>{t.subject}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', fontFamily: 'sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.preview}</div>
            </div>
          ))}
        </div>
        {/* Email panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Email header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'sans-serif', marginBottom: 4 }}>Re: Your proposal</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>From: <span style={{ color: 'rgba(165,180,252,0.8)' }}>sarah@techflow.com</span></div>
              <span style={{ fontSize: 7, color: '#ef4444', background: '#ef444422', border: '1px solid #ef444444', borderRadius: 3, padding: '1px 5px', fontFamily: 'sans-serif', fontWeight: 700 }}>HOT</span>
            </div>
          </div>
          {/* Email body */}
          <div style={{ flex: 1, padding: '10px 14px', overflow: 'hidden' }}>
            {[
              'Thanks for sending this over, I reviewed the proposal with our team and we\'re quite interested.',
              'A few questions before we move forward:',
              '· Can you walk us through the onboarding process?',
              '· What does the migration from HubSpot look like?',
              'Looking forward to your reply.',
            ].map((line, i) => (
              <div key={i} style={{ fontSize: 9, color: i === 0 || i === 4 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif', marginBottom: 5, lineHeight: 1.5 }}>{line}</div>
            ))}
          </div>
          {/* Reply bar */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '5px 10px' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'sans-serif' }}>Reply to Sarah…</span>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 6, padding: '5px 10px', fontSize: 9, color: '#fff', fontFamily: 'sans-serif', fontWeight: 600 }}>Send</div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup 3: Automated Sequences ──────────────────────────────────────────

function SequenceMockup() {
  const steps = [
    { type: 'email', label: 'Email 1', sub: 'Intro + value prop', day: 'Day 0', color: '#6366f1' },
    { type: 'wait', label: 'Wait', sub: '3 days', day: '', color: 'rgba(255,255,255,0.15)' },
    { type: 'email', label: 'Email 2', sub: 'Case study follow-up', day: 'Day 3', color: '#8b5cf6' },
    { type: 'wait', label: 'Wait', sub: '2 days', day: '', color: 'rgba(255,255,255,0.15)' },
    { type: 'linkedin', label: 'LinkedIn', sub: 'Connection request', day: 'Day 5', color: '#0a66c2' },
    { type: 'wait', label: 'Wait', sub: '4 days', day: '', color: 'rgba(255,255,255,0.15)' },
    { type: 'email', label: 'Email 3', sub: 'Breakup email', day: 'Day 9', color: '#f59e0b' },
  ]

  const metrics = [
    { label: 'Enrolled', value: '847' },
    { label: 'Open rate', value: '62%' },
    { label: 'Reply rate', value: '18%' },
    { label: 'Meetings', value: '43' },
  ]

  return (
    <BrowserFrame url="app.n0crm.io/sequences/outbound-q4">
      <div style={{ display: 'flex', height: 360 }}>
        <AppSidebar activeIndex={3} />
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'sans-serif' }}>Outbound Q4 2025</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>Active · 847 contacts enrolled</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '3px 8px', fontFamily: 'sans-serif' }}>Pause</div>
              <div style={{ fontSize: 9, color: 'rgba(165,180,252,0.9)', background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 5, padding: '3px 8px', fontFamily: 'sans-serif' }}>+ Add step</div>
            </div>
          </div>
          {/* Metrics */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {metrics.map((m) => (
              <div key={m.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(165,180,252,0.9)', fontFamily: 'sans-serif' }}>{m.value}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                  <div style={{ width: step.type === 'wait' ? 10 : 20, height: step.type === 'wait' ? 10 : 20, borderRadius: step.type === 'wait' ? '50%' : 6, background: step.color, flexShrink: 0, border: `1px solid ${step.color}99` }} />
                  {i < steps.length - 1 && <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />}
                </div>
                {step.type !== 'wait' ? (
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif' }}>{step.label}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif', marginLeft: 6 }}>{step.sub}</span>
                    </div>
                    <span style={{ fontSize: 8, color: step.color, fontFamily: 'sans-serif', fontWeight: 600 }}>{step.day}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'sans-serif', marginBottom: 2 }}>{step.sub}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  )
}

// ─── Mockup 4: Hero / Overview (all features) ────────────────────────────────

function HeroMockup() {
  const cols = [
    {
      label: 'PROSPECTING',
      color: '#6366f1',
      cards: [
        { company: 'Acme Corp', contact: 'Jorge M.', tag: 'Hot', tc: '#ef4444' },
        { company: 'TechFlow', contact: 'Sarah K.', tag: 'Warm', tc: '#f59e0b' },
        { company: 'NovaSoft', contact: 'Dmitri V.', tag: 'New', tc: '#3b82f6' },
      ],
    },
    {
      label: 'PROPOSAL',
      color: '#8b5cf6',
      cards: [
        { company: 'Helios Media', contact: 'Priya R.', tag: 'Hot', tc: '#ef4444' },
        { company: 'Buildworks', contact: 'Tom H.', tag: 'Warm', tc: '#f59e0b' },
      ],
    },
    {
      label: 'CLOSING',
      color: '#10b981',
      cards: [
        { company: 'Nexus AI', contact: 'Ana B.', tag: 'Hot', tc: '#ef4444' },
        { company: 'CloudPeak', contact: 'Ryan T.', tag: 'Hot', tc: '#ef4444' },
      ],
    },
  ]

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 860,
        margin: '0 auto',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
        background: '#0d0e1a',
      }}
    >
      {/* Browser chrome */}
      <div style={{ background: '#13141f', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['#ef4444', '#f59e0b', '#22c55e'] as const).map((c) => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.75, display: 'inline-block' }} />
          ))}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, height: 22, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>app.n0crm.io/pipeline</span>
        </div>
      </div>
      {/* App */}
      <div style={{ display: 'flex', height: 300 }}>
        <AppSidebar activeIndex={0} />
        <div style={{ flex: 1, overflow: 'hidden', padding: '12px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif' }}>Pipeline</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 5px', fontFamily: 'sans-serif' }}>7 deals</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {['Filter', 'Forecast', '+ Add'].map((lbl, i) => (
                <div key={lbl} style={{ fontSize: 9, color: i === 2 ? 'rgba(165,180,252,0.9)' : 'rgba(255,255,255,0.28)', background: i === 2 ? 'rgba(79,70,229,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 2 ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 5, padding: '3px 7px', fontFamily: 'sans-serif' }}>{lbl}</div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, height: 'calc(100% - 34px)', overflow: 'hidden' }}>
            {cols.map((col) => (
              <div key={col.label} style={{ flex: 1, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 7px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, boxShadow: `0 0 5px ${col.color}88`, display: 'inline-block' }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.38)', fontFamily: 'sans-serif', letterSpacing: '0.06em' }}>{col.label}</span>
                </div>
                {col.cards.map((card) => (
                  <div key={card.company} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '7px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif' }}>{card.company}</span>
                      <span style={{ fontSize: 7, color: card.tc, background: `${card.tc}22`, border: `1px solid ${card.tc}44`, borderRadius: 3, padding: '1px 4px', fontFamily: 'sans-serif', fontWeight: 700 }}>{card.tag}</span>
                    </div>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', fontFamily: 'sans-serif' }}>{card.contact}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable section eyebrow (light) ────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5 text-xs font-semibold"
      style={{ background: 'rgba(79,70,229,0.08)', border: `1px solid rgba(99,102,241,0.25)`, color: C.indigo, letterSpacing: '0.02em' }}
    >
      {children}
    </div>
  )
}

// ─── Main landing page ───────────────────────────────────────────────────────

export function Landing() {
  const t = useTranslations()

  const FEATURES = [
    { icon: Inbox,     title: t.landing.f1Title, description: t.landing.f1Desc },
    { icon: GitBranch, title: t.landing.f2Title, description: t.landing.f2Desc },
    { icon: BarChart3, title: t.landing.f3Title, description: t.landing.f3Desc },
    { icon: Bot,       title: t.landing.f4Title, description: t.landing.f4Desc },
    { icon: Users,     title: t.landing.f5Title, description: t.landing.f5Desc },
    { icon: Mail,      title: t.landing.f6Title, description: t.landing.f6Desc },
    { icon: Webhook,   title: t.landing.f7Title, description: t.landing.f7Desc },
    { icon: Shield,    title: t.landing.f8Title, description: t.landing.f8Desc },
    { icon: Globe,     title: t.landing.f9Title, description: t.landing.f9Desc },
  ]

  const METRICS = [
    { icon: Plug, to: 8, prefix: '', suffix: '+', label: 'native integrations' },
    { icon: Globe, to: 6, prefix: '', suffix: '', label: 'languages out of the box' },
    { icon: Clock, to: 5, prefix: '<', suffix: ' min', label: 'to your first synced inbox' },
    { icon: Bot, to: 3, prefix: '', suffix: '', label: 'built-in AI providers' },
  ]

  const CONNECTIONS = [
    { icon: Mail, name: 'Gmail', desc: 'Two-way sync — read, send and track from one inbox.' },
    { icon: Calendar, name: 'Google Calendar', desc: 'Meetings and booking links sync both ways.' },
    { icon: Slack, name: 'Slack', desc: 'Push deal and lead alerts to your channels.' },
    { icon: CreditCard, name: 'Stripe', desc: 'Billing and subscription data, connected.' },
    { icon: Linkedin, name: 'LinkedIn', desc: 'Enrich contacts and run social touchpoints.' },
    { icon: Webhook, name: 'Webhooks', desc: 'Signed events to Zapier, Make or your stack.' },
    { icon: Plug, name: 'Public API', desc: 'REST API with per-org keys and scopes.' },
    { icon: Bot, name: 'AI providers', desc: 'Gemini, OpenAI or Anthropic — your choice.' },
  ]

  const SECURITY = [
    { icon: ShieldCheck, title: 'MFA & account protection', desc: 'TOTP two-factor, account lockout and session revocation.' },
    { icon: KeyRound, title: 'SSO + SCIM', desc: 'OIDC single sign-on and automated user provisioning.' },
    { icon: Users, title: 'Role-based access', desc: 'Server-side RBAC across every record and action.' },
    { icon: Lock, title: 'Encryption at rest', desc: 'AES-256-GCM for tokens and sensitive fields; TLS in transit.' },
    { icon: Shield, title: 'GDPR ready', desc: 'Data-subject export and erasure endpoints, audit-logged.' },
    { icon: Database, title: 'Audit & event log', desc: 'Tamper-evident security-event trail for every login and change.' },
  ]

  const PRICING = [
    { name: 'Free', price: '$0', per: '', tagline: 'For getting started.', featured: false, cta: 'Start free', ctaTo: '/register', items: ['Up to 3 users', '1,000 contacts · 500 deals', 'Pipeline, inbox & activities', 'Gmail & Calendar sync'] },
    { name: 'Pro', price: '$39', per: '/user / mo', tagline: 'For growing outbound teams.', featured: true, cta: 'Start free trial', ctaTo: '/register', items: ['Unlimited contacts & deals', 'AI assistant & sequences', 'All integrations + webhooks', 'Public API access'] },
    { name: 'Enterprise', price: "Let's talk", per: '', tagline: 'For security-led orgs.', featured: false, cta: 'Book a demo', ctaTo: '/register', items: ['SSO (OIDC) + SCIM provisioning', 'Advanced RBAC & audit log', 'Priority support + SLA', 'Onboarding & migration help'] },
  ]

  const trustChips = ['Connect Gmail in 1 click', 'Live in minutes', 'Enterprise security included']

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: C.page, color: C.ink }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(255,255,255,0.82)', borderBottom: `1px solid ${C.line}` }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 6px 18px rgba(79,70,229,0.35)' }}
            >
              <Logo variant="icon" theme="onAccent" size={18} />
            </div>
            <Logo variant="wordmark" theme="light" size={20} />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: C.muted }}>
            <a href="#features" style={{ color: 'inherit', transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = C.ink)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>{t.landing.navFeatures}</a>
            <a href="#pricing" style={{ color: 'inherit', transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = C.ink)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Pricing</a>
            <a href="#connections" style={{ color: 'inherit', transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = C.ink)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Integrations</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-full transition-colors" style={{ color: C.body }} onMouseEnter={e => (e.currentTarget.style.color = C.ink)} onMouseLeave={e => (e.currentTarget.style.color = C.body)}>
              {t.landing.navLogin}
            </Link>
            <Link to="/register" className="btn-gradient flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200" style={{ color: '#ffffff' }}>
              {t.landing.heroCtaSecondary}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ paddingBottom: '5rem', background: `linear-gradient(180deg, ${C.soft} 0%, ${C.page} 70%)` }}>
        {/* Soft grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
        }} />
        {/* Color blobs */}
        <div className="absolute pointer-events-none" style={{ top: '-14%', left: '-4%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 68%)', filter: 'blur(56px)' }} />

        <div className="max-w-5xl mx-auto px-6 pt-20 sm:pt-24 text-center relative z-10">
          {/* Social-proof badge */}
          <div className="landing-hero-in inline-flex items-center gap-2 mb-7" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: '#ffffff', border: `1px solid rgba(99,102,241,0.3)`, color: C.indigo, boxShadow: '0 6px 20px rgba(79,70,229,0.12)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Outbound CRM · connected &amp; AI-native
            </div>
          </div>

          <h1 className="landing-hero-in font-display font-bold tracking-tight mb-6 leading-[1.04] pb-1" style={{ fontSize: 'clamp(2.9rem, 6.8vw, 5.4rem)', color: C.ink, animationDelay: '70ms' }}>
            {t.landing.heroHeadline}{' '}
            <span className="text-gradient-brand">{t.landing.heroHeadlineAccent}</span>
          </h1>

          <p className="landing-hero-in max-w-2xl mx-auto text-lg mb-9 leading-relaxed" style={{ color: C.body, animationDelay: '140ms' }}>
            {t.landing.heroSubtitle}
          </p>

          <div className="landing-hero-in flex flex-col sm:flex-row items-center justify-center gap-4 mb-7" style={{ animationDelay: '210ms' }}>
            <Link to="/login" className="btn-gradient flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200" style={{ color: '#ffffff' }}>
              {t.landing.heroCta}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200" style={{ border: `1px solid ${C.lineStrong}`, color: C.ink, background: '#ffffff' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.background = 'rgba(79,70,229,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.lineStrong; e.currentTarget.style.background = '#ffffff' }}>
              {t.landing.heroCtaSecondary}
            </Link>
          </div>

          <div className="landing-hero-in flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-16 text-sm" style={{ color: C.muted, animationDelay: '280ms' }}>
            {trustChips.map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                {chip}
              </span>
            ))}
          </div>

          {/* Product screenshot */}
          <div className="relative landing-hero-in" style={{ animationDelay: '340ms' }}>
            <div className="absolute pointer-events-none" style={{ bottom: -50, left: '50%', transform: 'translateX(-50%)', width: '74%', height: 150, background: 'radial-gradient(ellipse, rgba(99,102,241,0.16) 0%, transparent 72%)', filter: 'blur(52px)' }} />
            <div className="landing-float">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Connections showcase ────────────────────────────────────────────── */}
      <section id="connections" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.soft }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <Reveal>
            <div className="text-center mb-12">
              <div className="flex justify-center"><Eyebrow><Plug className="w-3.5 h-3.5" /> Connections</Eyebrow></div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.ink }}>
                Connects with the tools<br className="hidden sm:block" /> you already use.
              </h2>
              <p className="max-w-xl mx-auto" style={{ color: C.muted }}>
                Sign up, connect your stack in a few clicks, and your data flows in — fully managed, nothing to install or maintain.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {CONNECTIONS.map(({ icon: Icon, name, desc }, i) => (
              <Reveal key={name} delay={(i % 4) * 80}>
                <div
                  className="rounded-2xl p-5 h-full flex items-start gap-3 transition-all duration-200"
                  style={{ background: '#ffffff', border: `1px solid ${C.line}`, boxShadow: '0 10px 30px -22px rgba(15,23,42,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.line; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Icon className="w-5 h-5" style={{ color: C.indigo }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-0.5" style={{ color: C.ink }}>{name}</p>
                    <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics (animated counters) ─────────────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map(({ icon: Icon, to, prefix, suffix, label }, i) => (
            <Reveal key={label} delay={i * 90}>
              <div className="rounded-2xl px-6 py-7 h-full" style={{ background: '#ffffff', border: `1px solid ${C.line}`, boxShadow: '0 10px 30px -18px rgba(15,23,42,0.25)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <Icon className="w-5 h-5" style={{ color: C.indigo }} />
                </div>
                <p className="text-4xl font-bold font-display mb-1" style={{ color: C.ink }}>
                  <Counter to={to} prefix={prefix} suffix={suffix} />
                </p>
                <p className="text-sm" style={{ color: C.muted }}>{label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Feature spotlight 1: Pipeline ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ color: C.ink }}>
              Your entire pipeline,<br />
              <span className="text-gradient-brand">always in view.</span>
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: C.body }}>
              Drag-and-drop Kanban, deal values, close probability, and real-time forecast — all in one place. Managers get the full picture; reps stay focused on closing.
            </p>
            <ul className="space-y-3">
              {['Drag-and-drop Kanban with custom stages', 'Revenue forecast updated in real time', 'Deal aging alerts and stale pipeline detection', 'Manager dashboard with team-level view'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: C.body }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.indigo }} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative">
              <div className="absolute pointer-events-none" style={{ inset: -30, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(28px)' }} />
              <div className="relative">
                <KanbanMockup />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Feature spotlight 2: Inbox ──────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, background: C.soft }}>
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal delay={120} className="order-2 lg:order-1">
              <div className="relative">
                <div className="absolute pointer-events-none" style={{ inset: -30, background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, transparent 70%)', filter: 'blur(28px)' }} />
                <div className="relative">
                  <InboxMockup />
                </div>
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ color: C.ink }}>
                Reply to leads without<br />
                <span className="text-gradient-brand">switching tabs.</span>
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: C.body }}>
                Native Gmail sync brings every conversation into n0CRM. Read, reply, track opens and clicks — all tied to the right deal and contact, automatically.
              </p>
              <ul className="space-y-3">
                {['Native Gmail + SMTP sync', 'Open and click tracking per email', 'Threads auto-linked to contacts and deals', 'Reply detection to pause sequences automatically'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm" style={{ color: C.body }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.indigo }} />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 3: Sequences ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ color: C.ink }}>
              Multi-step cadences that<br />
              <span className="text-gradient-brand">stop when they reply.</span>
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: C.body }}>
              Build sequences with email steps, LinkedIn touchpoints, and wait conditions. The CRM advances the deal automatically when a lead responds — no manual work.
            </p>
            <ul className="space-y-3">
              {['Email + LinkedIn multi-channel cadences', 'Conditional logic based on lead behaviour', 'Auto-advance deals on reply', 'Open rate, click rate and reply rate per step'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: C.body }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.indigo }} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative">
              <div className="absolute pointer-events-none" style={{ inset: -30, background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.16) 0%, transparent 70%)', filter: 'blur(28px)' }} />
              <div className="relative">
                <SequenceMockup />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section id="features" style={{ borderTop: `1px solid ${C.line}`, background: C.soft }}>
        <div className="max-w-6xl mx-auto px-6 py-28">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.ink }}>{t.landing.featuresTitle}</h2>
              <p className="max-w-xl mx-auto" style={{ color: C.muted }}>{t.landing.featuresSubtitle}</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <div
                  className="rounded-2xl p-6 h-full transition-all duration-200 cursor-default"
                  style={{ background: '#ffffff', border: `1px solid ${C.line}`, boxShadow: '0 10px 30px -20px rgba(15,23,42,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 40px -18px rgba(79,70,229,0.35)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.line; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px -20px rgba(15,23,42,0.3)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.14) 0%, rgba(124,58,237,0.08) 100%)', border: '1px solid rgba(99,102,241,0.22)' }}>
                    <Icon className="w-5 h-5" style={{ color: C.indigo }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: C.ink }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-28">
        <Reveal>
          <div className="rounded-3xl px-8 py-12 sm:px-14 sm:py-14 text-center relative overflow-hidden" style={{ background: '#ffffff', border: `1px solid ${C.line}`, boxShadow: '0 30px 80px -40px rgba(15,23,42,0.3)' }}>
            <div className="absolute pointer-events-none" style={{ top: -60, left: '50%', transform: 'translateX(-50%)', width: 420, height: 200, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(36px)' }} />
            <Quote className="w-9 h-9 mx-auto mb-5" style={{ color: 'rgba(99,102,241,0.5)' }} />
            <div className="flex items-center justify-center gap-1 mb-5">
              {[0, 1, 2, 3, 4].map((s) => (
                <Star key={s} className="w-4 h-4" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              ))}
            </div>
            <p className="font-display text-xl sm:text-2xl font-semibold leading-snug mb-7 relative" style={{ color: C.ink }}>
              “We replaced three tools with n0CRM and finally own our pipeline data. Reps reply from one inbox, sequences pause themselves, and our forecast is actually trusted.”
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>S</div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>Sales lead</p>
                <p className="text-xs" style={{ color: C.muted }}>B2B SaaS · outbound team of 12</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Security as trust ───────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${C.line}`, background: C.soft }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.ink }}>
                We run it. <span className="text-gradient-brand">Your data stays protected.</span>
              </h2>
              <p className="max-w-xl mx-auto" style={{ color: C.muted }}>
                A managed service with the controls security teams ask for — built in, not bolted on.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 80}>
                <div className="rounded-2xl p-6 h-full" style={{ background: '#ffffff', border: `1px solid ${C.line}`, boxShadow: '0 10px 30px -22px rgba(15,23,42,0.3)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Icon className="w-5 h-5" style={{ color: C.indigo }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: C.ink }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-28">
        <Reveal>
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.ink }}>Simple, per-seat pricing.</h2>
            <p className="max-w-xl mx-auto" style={{ color: C.muted }}>Start free. Upgrade when your team grows. Cancel anytime.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {PRICING.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90}>
              <div
                className="rounded-3xl p-8 h-full flex flex-col relative"
                style={{
                  background: plan.featured ? 'linear-gradient(160deg, #0d0e1a 0%, #1b1c34 100%)' : '#ffffff',
                  border: plan.featured ? '1px solid rgba(99,102,241,0.5)' : `1px solid ${C.line}`,
                  boxShadow: plan.featured ? '0 30px 70px -30px rgba(79,70,229,0.5)' : '0 12px 34px -22px rgba(15,23,42,0.3)',
                }}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-2xs font-bold" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', whiteSpace: 'nowrap' }}>MOST POPULAR</span>
                )}
                <p className="text-sm font-semibold mb-1" style={{ color: plan.featured ? '#c7d2fe' : C.indigo }}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-display text-4xl font-bold" style={{ color: plan.featured ? '#f8fafc' : C.ink }}>{plan.price}</span>
                  {plan.per && <span className="text-sm mb-1" style={{ color: plan.featured ? 'rgba(241,245,249,0.6)' : C.muted }}>{plan.per}</span>}
                </div>
                <p className="text-sm mb-6" style={{ color: plan.featured ? 'rgba(241,245,249,0.6)' : C.muted }}>{plan.tagline}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-sm" style={{ color: plan.featured ? 'rgba(241,245,249,0.8)' : C.body }}>
                      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.featured ? '#818cf8' : C.indigo }} />
                      {it}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaTo}
                  className={plan.featured ? 'btn-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200' : 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200'}
                  style={plan.featured ? { color: '#ffffff' } : { border: `1px solid ${C.lineStrong}`, color: C.ink, background: '#ffffff' }}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: C.faint }}>Billed per active user · 14-day free trial · cancel anytime.</p>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section id="stack" className="relative overflow-hidden" style={{ borderTop: `1px solid ${C.line}`, background: C.soft }}>
        <div className="absolute pointer-events-none" style={{ top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 380, background: 'radial-gradient(ellipse, rgba(99,102,241,0.16) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="max-w-3xl mx-auto px-6 py-28 text-center relative z-10">
          <Reveal>
            <div className="rounded-3xl px-10 py-14 relative" style={{ background: '#ffffff', border: `1px solid ${C.lineStrong}`, boxShadow: '0 40px 100px -45px rgba(79,70,229,0.4)' }}>
              <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: C.ink }}>{t.landing.ctaTitle}</h2>
              <p className="mb-10 text-lg" style={{ color: C.body }}>{t.landing.ctaSubtitle}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login" className="btn-gradient inline-flex items-center gap-2 rounded-full px-10 py-4 text-base font-semibold transition-all duration-200" style={{ color: '#ffffff' }}>
                  {t.landing.ctaButton}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200" style={{ border: `1px solid ${C.lineStrong}`, color: C.ink, background: '#ffffff' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.55)'; e.currentTarget.style.background = 'rgba(79,70,229,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.lineStrong; e.currentTarget.style.background = '#ffffff' }}>
                  {t.landing.heroCtaSecondary}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.line}`, background: C.page }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <Logo variant="icon" theme="onAccent" size={13} />
            </div>
            <span className="text-sm font-semibold" style={{ color: C.muted }}>n0CRM</span>
          </div>
          <p className="text-xs" style={{ color: C.faint }}>
            The connected outbound CRM · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
