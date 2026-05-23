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

// ─── Pure-CSS CRM dashboard mockup ──────────────────────────────────────────

function ProductMockup() {
  const kanbanCols = [
    {
      label: 'Prospecting',
      color: '#6366f1',
      cards: [
        { label: 'Acme Corp', sub: 'Jorge M.', tag: 'Hot', tagColor: '#ef4444' },
        { label: 'TechFlow Ltd', sub: 'Sarah K.', tag: 'Warm', tagColor: '#f59e0b' },
        { label: 'NovaSoft', sub: 'Dmitri V.', tag: 'New', tagColor: '#3b82f6' },
      ],
    },
    {
      label: 'Proposal',
      color: '#8b5cf6',
      cards: [
        { label: 'Helios Media', sub: 'Priya R.', tag: 'Hot', tagColor: '#ef4444' },
        { label: 'Buildworks', sub: 'Tom H.', tag: 'Warm', tagColor: '#f59e0b' },
      ],
    },
    {
      label: 'Closing',
      color: '#10b981',
      cards: [
        { label: 'DataBridge', sub: 'Lisa N.', tag: 'Hot', tagColor: '#ef4444' },
        { label: 'Orbital SaaS', sub: 'Marco F.', tag: 'Warm', tagColor: '#f59e0b' },
      ],
    },
  ]

  const sidebarIcons = ['●', '◈', '◎', '▦', '◇']

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 780,
        margin: '0 auto',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
        background: '#0d0e1a',
      }}
    >
      {/* Browser chrome */}
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
          {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
            <span
              key={c}
              style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }}
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
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
            app.n0crm.io/pipeline
          </span>
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: 'flex', height: 320 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 48,
            background: '#0a0b14',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 14,
            gap: 18,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'monospace',
              marginBottom: 6,
              boxShadow: '0 0 12px rgba(79,70,229,0.45)',
            }}
          >
            n_
          </div>
          {sidebarIcons.map((icon, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: i === 1 ? 'rgba(129,140,248,0.9)' : 'rgba(255,255,255,0.2)',
                background: i === 1 ? 'rgba(79,70,229,0.18)' : 'transparent',
              }}
            >
              {icon}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '14px 14px 0' }}>
          {/* Topbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'sans-serif',
                }}
              >
                Pipeline
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontFamily: 'sans-serif',
                }}
              >
                7 deals
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Filter', 'Group', '+ Add'].map((lbl, i) => (
                <div
                  key={lbl}
                  style={{
                    fontSize: 10,
                    color:
                      i === 2
                        ? 'rgba(129,140,248,0.9)'
                        : 'rgba(255,255,255,0.3)',
                    background:
                      i === 2
                        ? 'rgba(79,70,229,0.18)'
                        : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${i === 2 ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 5,
                    padding: '3px 8px',
                    fontFamily: 'sans-serif',
                  }}
                >
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          {/* Kanban board */}
          <div style={{ display: 'flex', gap: 10, height: 'calc(100% - 36px)', overflow: 'hidden' }}>
            {kanbanCols.map((col) => (
              <div
                key={col.label}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  overflow: 'hidden',
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: col.color,
                      boxShadow: `0 0 6px ${col.color}99`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: 'sans-serif',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {col.label.toUpperCase()}
                  </span>
                </div>

                {/* Cards */}
                {col.cards.map((card) => (
                  <div
                    key={card.label}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 7,
                      padding: '7px 8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.75)',
                          fontFamily: 'sans-serif',
                        }}
                      >
                        {card.label}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color: card.tagColor,
                          background: `${card.tagColor}22`,
                          border: `1px solid ${card.tagColor}44`,
                          borderRadius: 3,
                          padding: '1px 5px',
                          fontFamily: 'sans-serif',
                          fontWeight: 600,
                        }}
                      >
                        {card.tag}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      {card.sub}
                    </span>
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
    { icon: Inbox,    title: t.landing.f1Title, description: t.landing.f1Desc },
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
    { value: '9',  label: t.landing.stat1Label },
    { value: '29', label: t.landing.stat2Label },
    { value: '∞',  label: t.landing.stat3Label },
    { value: '0',  label: t.landing.stat4Label },
  ]

  const SELF_HOST_ITEMS = [
    t.landing.selfHostItem1,
    t.landing.selfHostItem2,
    t.landing.selfHostItem3,
    t.landing.selfHostItem4,
  ]

  // SVG dot-grid pattern as data URI
  const dotGridBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='1' cy='1' r='1' fill='rgba(255%2C255%2C255%2C0.045)'/%3E%3C/svg%3E")`

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: '#06070f', color: '#f1f5f9' }}
    >
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(6,7,15,0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: '0 0 16px rgba(79,70,229,0.4)',
              }}
            >
              <Logo variant="icon" theme="onAccent" size={18} />
            </div>
            <Logo variant="wordmark" theme="dark" size={20} />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'rgba(241,245,249,0.5)' }}>
            <a
              href="#features"
              className="transition-colors duration-150"
              style={{ color: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.5)')}
            >
              {t.landing.navFeatures}
            </a>
            <a
              href="#stack"
              className="transition-colors duration-150"
              style={{ color: 'inherit' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.5)')}
            >
              {t.landing.navStack}
            </a>
          </nav>

          <Link
            to="/login"
            className="btn-gradient flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{ color: '#ffffff' }}
          >
            {t.landing.navLogin}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '85vh' }}>
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: dotGridBg }}
        />

        {/* Orb 1 — top-left indigo */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-15%',
            left: '-10%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(79,70,229,0.28) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        {/* Orb 2 — top-right violet */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-5%',
            right: '-12%',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)',
            filter: 'blur(56px)',
          }}
        />
        {/* Orb 3 — center subtle blue */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '30%',
            left: '35%',
            width: 700,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 65%)',
            filter: 'blur(64px)',
          }}
        />

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
              style={{
                background: 'rgba(79,70,229,0.12)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: 'rgba(165,180,252,0.9)',
                boxShadow: '0 0 16px rgba(79,70,229,0.15)',
              }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
              {t.landing.badge}
            </div>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold tracking-tight mb-6 leading-none"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
          >
            {t.landing.heroHeadline}{' '}
            <span className="text-gradient">{t.landing.heroHeadlineAccent}</span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-2xl mx-auto text-lg mb-10 leading-relaxed"
            style={{ color: 'rgba(241,245,249,0.5)' }}
          >
            {t.landing.heroSubtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login"
              className="btn-gradient flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition-all duration-200"
              style={{ color: '#ffffff' }}
            >
              {t.landing.heroCta}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium transition-all duration-200"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(241,245,249,0.7)',
                background: 'rgba(255,255,255,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'
                e.currentTarget.style.color = '#f1f5f9'
                e.currentTarget.style.background = 'rgba(79,70,229,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'rgba(241,245,249,0.7)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              {t.landing.heroCtaSecondary}
            </Link>
          </div>

          {/* Product mockup */}
          <div className="relative">
            {/* Glow under mockup */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '70%',
                height: 120,
                background: 'radial-gradient(ellipse, rgba(79,70,229,0.3) 0%, transparent 70%)',
                filter: 'blur(32px)',
              }}
            />
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <section
        className="relative"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl px-8 py-6"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-4xl font-bold font-display text-gradient mb-1">{value}</p>
              <p className="text-sm" style={{ color: 'rgba(241,245,249,0.45)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">{t.landing.featuresTitle}</h2>
          <p className="max-w-xl mx-auto" style={{ color: 'rgba(241,245,249,0.45)' }}>
            {t.landing.featuresSubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl p-6 group transition-all duration-200 cursor-default"
              style={{
                background: '#0d0e1a',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(99,102,241,0.35)'
                el.style.boxShadow = '0 8px 32px rgba(79,70,229,0.1)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.boxShadow = 'none'
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(129,140,248,0.08) 100%)',
                  border: '1px solid rgba(129,140,248,0.18)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: '#818cf8' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(241,245,249,0.45)' }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Self-host block ────────────────────────────────────────────────── */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div
          className="rounded-2xl p-10 sm:p-14 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(13,14,26,0.9) 50%, rgba(17,18,32,0.8) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            boxShadow: '0 0 60px rgba(79,70,229,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: -80,
              right: -80,
              width: 400,
              height: 400,
              background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
              filter: 'blur(48px)',
            }}
          />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                {t.landing.selfHostTitle}{' '}
                <span className="text-gradient">{t.landing.selfHostTitleAccent}</span>
              </h2>
              <p className="leading-relaxed mb-6" style={{ color: 'rgba(241,245,249,0.55)' }}>
                {t.landing.selfHostSubtitle}
              </p>

              <ul className="space-y-3">
                {SELF_HOST_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(241,245,249,0.65)' }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Terminal block */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: '#080910',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}
            >
              {/* Terminal header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: '#0f1020',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center gap-2">
                  {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                    <span
                      key={c}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: c,
                        opacity: 0.7,
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  Terminal
                </span>
                <div style={{ width: 50 }} />
              </div>

              {/* Terminal content */}
              <div className="font-mono text-sm p-6 text-left">
                <p className="mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {t.landing.codeComment1}
                </p>
                <p>
                  <span style={{ color: '#818cf8' }}>$</span>{' '}
                  <span style={{ color: 'rgba(241,245,249,0.8)' }}>git clone n0crm</span>
                </p>
                <p>
                  <span style={{ color: '#818cf8' }}>$</span>{' '}
                  <span style={{ color: 'rgba(241,245,249,0.8)' }}>cp .env.example .env</span>
                </p>
                <p>
                  <span style={{ color: '#818cf8' }}>$</span>{' '}
                  <span style={{ color: 'rgba(241,245,249,0.8)' }}>docker compose up -d</span>
                </p>
                <p className="mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {t.landing.codeComment2}
                </p>
                <p className="mt-1" style={{ color: '#34d399' }}>
                  {t.landing.codeSuccess}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(79,70,229,0.08) 40%, rgba(6,7,15,0.95) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Background orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.2) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div className="max-w-3xl mx-auto px-6 py-28 text-center relative z-10">
          <div
            className="rounded-2xl px-10 py-14 relative"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 0 80px rgba(79,70,229,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="font-display text-4xl sm:text-5xl font-bold mb-4 leading-tight"
            >
              {t.landing.ctaTitle}
            </h2>
            <p className="mb-10 text-lg" style={{ color: 'rgba(241,245,249,0.5)' }}>
              {t.landing.ctaSubtitle}
            </p>
            <Link
              to="/login"
              className="btn-gradient inline-flex items-center gap-2 rounded-full px-10 py-4 text-base font-semibold transition-all duration-200"
              style={{ color: '#ffffff' }}
            >
              {t.landing.ctaButton}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#06070f',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              }}
            >
              <Logo variant="icon" theme="onAccent" size={13} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'rgba(241,245,249,0.45)' }}>
              n0CRM
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(241,245,249,0.2)' }}>
            {t.landing.footerTagline} · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
