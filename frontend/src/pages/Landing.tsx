import { Link } from 'react-router-dom'
import {
  Zap,
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
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { useTranslations } from '../i18n'

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

  const STATS = [
    { value: '100%', label: 'data ownership' },
    { value: '∞',    label: 'workspaces' },
    { value: '5 min', label: 'to deploy' },
    { value: '$0',   label: 'vendor lock-in' },
  ]

  const SELF_HOST_ITEMS = [
    t.landing.selfHostItem1,
    t.landing.selfHostItem2,
    t.landing.selfHostItem3,
    t.landing.selfHostItem4,
  ]

  const sectionLabel = (text: string, color = '#818cf8') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
      <span style={{ width: 20, height: 3, borderRadius: 2, background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'sans-serif', letterSpacing: '0.02em' }}>
        {text}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#06070f', color: '#f1f5f9' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(6,7,15,0.85)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}
            >
              <Logo variant="icon" theme="onAccent" size={18} />
            </div>
            <Logo variant="wordmark" theme="dark" size={20} />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'rgba(241,245,249,0.5)' }}>
            <a href="#features" style={{ color: 'inherit', transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(241,245,249,0.5)')}>{t.landing.navFeatures}</a>
            <a href="#stack" style={{ color: 'inherit', transition: 'color 150ms' }} onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(241,245,249,0.5)')}>{t.landing.navStack}</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium px-4 py-2 rounded-full transition-colors" style={{ color: 'rgba(241,245,249,0.6)' }} onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(241,245,249,0.6)')}>
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
      <section className="relative overflow-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='0' cy='0' r='1.2' fill='rgba(255%2C255%2C255%2C0.1)'/%3E%3C/svg%3E"), linear-gradient(rgba(255%2C255%2C255%2C0.025) 1px%2C transparent 1px), linear-gradient(90deg%2C rgba(255%2C255%2C255%2C0.025) 1px%2C transparent 1px)`,
          backgroundSize: '40px 40px, 40px 40px, 40px 40px',
        }} />
        {/* Orbs */}
        <div className="absolute pointer-events-none" style={{ top: '-10%', left: '-8%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 68%)', filter: 'blur(48px)' }} />
        <div className="absolute pointer-events-none" style={{ top: '-5%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 68%)', filter: 'blur(56px)' }} />

        <div className="max-w-5xl mx-auto px-6 pt-24 pb-0 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium" style={{ background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(99,102,241,0.4)', color: 'rgba(165,180,252,0.9)', boxShadow: '0 0 16px rgba(79,70,229,0.15)' }}>
              <Zap className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
              {t.landing.badge}
            </div>
          </div>

          <h1 className="font-display font-bold tracking-tight mb-6 leading-none" style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>
            {t.landing.heroHeadline}{' '}
            <span className="text-gradient">{t.landing.heroHeadlineAccent}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg mb-10 leading-relaxed" style={{ color: 'rgba(241,245,249,0.5)' }}>
            {t.landing.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login" className="btn-gradient flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200" style={{ color: '#ffffff' }}>
              {t.landing.heroCta}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium transition-all duration-200" style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(241,245,249,0.7)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'; e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(79,70,229,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(241,245,249,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}>
              {t.landing.heroCtaSecondary}
            </Link>
          </div>

          {/* Product screenshot */}
          <div className="relative">
            <div className="absolute pointer-events-none" style={{ bottom: -60, left: '50%', transform: 'translateX(-50%)', width: '80%', height: 160, background: 'radial-gradient(ellipse, rgba(79,70,229,0.35) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Tech strip ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center gap-8 flex-wrap">
          {['PostgreSQL', 'Fastify', 'Socket.io', 'Docker', 'React', 'TypeScript', 'Nginx'].map((tech) => (
            <span key={tech} className="text-sm font-medium" style={{ color: 'rgba(241,245,249,0.25)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{tech}</span>
          ))}
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label} className="rounded-2xl px-8 py-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-4xl font-bold font-display text-gradient mb-1">{value}</p>
              <p className="text-sm" style={{ color: 'rgba(241,245,249,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature spotlight 1: Pipeline ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {sectionLabel('Pipeline & Forecast ›')}
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              Your entire pipeline,<br />
              <span className="text-gradient">always in view.</span>
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: 'rgba(241,245,249,0.5)' }}>
              Drag-and-drop Kanban, deal values, close probability, and real-time forecast — all in one place. Managers get the full picture; reps stay focused on closing.
            </p>
            <ul className="space-y-3">
              {['Drag-and-drop Kanban with custom stages', 'Revenue forecast updated in real time', 'Deal aging alerts and stale pipeline detection', 'Manager dashboard with team-level view'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(241,245,249,0.65)' }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute pointer-events-none" style={{ inset: -40, background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
            <div className="relative">
              <KanbanMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 2: Inbox ──────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute pointer-events-none" style={{ inset: -40, background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
              <div className="relative">
                <InboxMockup />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              {sectionLabel('Unified Inbox ›')}
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Reply to leads without<br />
                <span className="text-gradient">switching tabs.</span>
              </h2>
              <p className="mb-8 leading-relaxed" style={{ color: 'rgba(241,245,249,0.5)' }}>
                Native Gmail sync brings every conversation into n0CRM. Read, reply, track opens and clicks — all tied to the right deal and contact, automatically.
              </p>
              <ul className="space-y-3">
                {['Native Gmail + SMTP sync', 'Open and click tracking per email', 'Threads auto-linked to contacts and deals', 'Reply detection to pause sequences automatically'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(241,245,249,0.65)' }}>
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature spotlight 3: Sequences ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {sectionLabel('Automated Sequences ›')}
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              Multi-step cadences that<br />
              <span className="text-gradient">stop when they reply.</span>
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: 'rgba(241,245,249,0.5)' }}>
              Build sequences with email steps, LinkedIn touchpoints, and wait conditions. The CRM advances the deal automatically when a lead responds — no manual work.
            </p>
            <ul className="space-y-3">
              {['Email + LinkedIn multi-channel cadences', 'Conditional logic based on lead behaviour', 'Auto-advance deals on reply', 'Open rate, click rate and reply rate per step'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(241,245,249,0.65)' }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute pointer-events-none" style={{ inset: -40, background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
            <div className="relative">
              <SequenceMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section id="features" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.012)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{t.landing.featuresTitle}</h2>
            <p className="max-w-xl mx-auto" style={{ color: 'rgba(241,245,249,0.45)' }}>{t.landing.featuresSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-6 transition-all duration-200 cursor-default"
                style={{ background: '#0d0e1a', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(79,70,229,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(129,140,248,0.08) 100%)', border: '1px solid rgba(129,140,248,0.18)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#818cf8' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(241,245,249,0.45)' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Self-host block ──────────────────────────────────────────────────── */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div
          className="rounded-2xl p-10 sm:p-14 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(13,14,26,0.95) 50%, rgba(17,18,32,0.85) 100%)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 0 60px rgba(79,70,229,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' }}
        >
          <div className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(48px)' }} />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                {t.landing.selfHostTitle}{' '}
                <span className="text-gradient">{t.landing.selfHostTitleAccent}</span>
              </h2>
              <p className="leading-relaxed mb-6" style={{ color: 'rgba(241,245,249,0.55)' }}>{t.landing.selfHostSubtitle}</p>
              <ul className="space-y-3">
                {SELF_HOST_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(241,245,249,0.65)' }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Terminal */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#080910', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ background: '#0f1020', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  {(['#ef4444', '#f59e0b', '#22c55e'] as const).map((c) => (
                    <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7, display: 'inline-block' }} />
                  ))}
                </div>
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>Terminal</span>
                <div style={{ width: 50 }} />
              </div>
              <div className="font-mono text-sm p-6 text-left">
                <p className="mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.landing.codeComment1}</p>
                <p><span style={{ color: '#818cf8' }}>$</span> <span style={{ color: 'rgba(241,245,249,0.8)' }}>git clone n0crm</span></p>
                <p><span style={{ color: '#818cf8' }}>$</span> <span style={{ color: 'rgba(241,245,249,0.8)' }}>cp .env.example .env</span></p>
                <p><span style={{ color: '#818cf8' }}>$</span> <span style={{ color: 'rgba(241,245,249,0.8)' }}>docker compose up -d</span></p>
                <p className="mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.landing.codeComment2}</p>
                <p className="mt-1" style={{ color: '#34d399' }}>{t.landing.codeSuccess}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute pointer-events-none" style={{ top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(79,70,229,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="max-w-3xl mx-auto px-6 py-28 text-center relative z-10">
          <div className="rounded-2xl px-10 py-14 relative" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 0 80px rgba(79,70,229,0.1), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight">{t.landing.ctaTitle}</h2>
            <p className="mb-10 text-lg" style={{ color: 'rgba(241,245,249,0.5)' }}>{t.landing.ctaSubtitle}</p>
            <Link to="/login" className="btn-gradient inline-flex items-center gap-2 rounded-full px-10 py-4 text-base font-semibold transition-all duration-200" style={{ color: '#ffffff' }}>
              {t.landing.ctaButton}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#06070f' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <Logo variant="icon" theme="onAccent" size={13} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'rgba(241,245,249,0.4)' }}>n0CRM</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(241,245,249,0.2)' }}>
            {t.landing.footerTagline} · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
