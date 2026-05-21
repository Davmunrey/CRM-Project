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

  return (
    <div className="min-h-screen bg-surface-0 text-fg overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-fg/5 bg-surface-0/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-brand-sm"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Logo variant="icon" theme="onAccent" size={18} />
            </div>
            <Logo variant="wordmark" theme="dark" size={20} />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-fg/60">
            <a href="#features" className="hover:text-fg transition-colors duration-150">{t.landing.navFeatures}</a>
            <a href="#stack" className="hover:text-fg transition-colors duration-150">{t.landing.navStack}</a>
          </nav>

          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-fg/10 hover:bg-fg/15 border border-fg/10 hover:border-fg/20 px-4 py-2 text-sm font-medium text-fg transition-all duration-150"
          >
            {t.landing.navLogin}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-4 py-1.5 text-xs font-medium text-accent-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          {t.landing.badge}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-fg mb-6 leading-tight">
          {t.landing.heroHeadline}{' '}
          <span className="bg-gradient-to-r from-accent-400 to-accentAccent bg-clip-text text-transparent">
            {t.landing.heroHeadlineAccent}
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-fg/60 mb-10 leading-relaxed">
          {t.landing.heroSubtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-500 px-7 py-3.5 text-base font-semibold text-fg shadow-lg shadow-accent-900/40 hover:shadow-accent-800/50 transition-all duration-200 hover:scale-[1.02]"
          >
            {t.landing.heroCta}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-full border border-fg/15 hover:border-fg/25 bg-fg/5 hover:bg-fg/10 px-7 py-3.5 text-base font-medium text-fg/80 hover:text-fg transition-all duration-200"
          >
            {t.landing.heroCtaSecondary}
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-fg/5 bg-fg/2">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold font-display text-fg mb-1">{value}</p>
              <p className="text-sm text-fg/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-fg mb-4">
            {t.landing.featuresTitle}
          </h2>
          <p className="text-fg/50 max-w-xl mx-auto">
            {t.landing.featuresSubtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-fg/5 rounded-2xl overflow-hidden">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-surface-0 hover:bg-surface-1/80 p-7 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-600/15 flex items-center justify-center mb-4 group-hover:bg-accent-600/25 transition-colors duration-200">
                <Icon className="w-5 h-5 text-accent-400" />
              </div>
              <h3 className="font-semibold text-fg mb-2">{title}</h3>
              <p className="text-sm text-fg/50 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Self-host block */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-12 pb-24">
        <div className="rounded-2xl border border-accent-500/20 bg-gradient-to-br from-accent-900/30 via-surface-0/40 to-surface-0/20 p-10 sm:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-fg mb-4">
                {t.landing.selfHostTitle}{' '}
                <span className="text-accent-400">{t.landing.selfHostTitleAccent}</span>
              </h2>
              <p className="text-fg/60 leading-relaxed mb-6">
                {t.landing.selfHostSubtitle}
              </p>

              <ul className="space-y-3">
                {SELF_HOST_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-fg/70">
                    <CheckCircle className="w-4 h-4 text-accent-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="font-mono text-sm bg-surface-0/60 rounded-xl border border-fg/8 p-6 text-left">
              <p className="text-fg/30 mb-3">{t.landing.codeComment1}</p>
              <p><span className="text-accent-400">$</span> <span className="text-fg/80">git clone n0crm</span></p>
              <p><span className="text-accent-400">$</span> <span className="text-fg/80">cp .env.example .env</span></p>
              <p><span className="text-accent-400">$</span> <span className="text-fg/80">docker compose up -d</span></p>
              <p className="mt-3 text-fg/30">{t.landing.codeComment2}</p>
              <p className="text-success mt-1">{t.landing.codeSuccess}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-fg/5">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-fg mb-4">
            {t.landing.ctaTitle}
          </h2>
          <p className="text-fg/50 mb-8">
            {t.landing.ctaSubtitle}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 hover:bg-accent-500 px-8 py-4 text-base font-semibold text-fg shadow-xl shadow-accent-900/50 hover:shadow-accent-800/60 transition-all duration-200 hover:scale-[1.02]"
          >
            {t.landing.ctaButton}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fg/5 bg-surface-0">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#4f46e5' }}
            >
              <Logo variant="icon" theme="onAccent" size={13} />
            </div>
            <span className="text-sm font-semibold text-fg/60">n0CRM</span>
          </div>
          <p className="text-xs text-fg/25">{t.landing.footerTagline} · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
