'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BarChart3, Bot, Mail, Shield, Users } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/lib/appIdentity'

const C = {
  green: '#0C8A68',
  ink: '#0C1F1A',
  mint: '#44C2A0',
  mintLight: '#9BE8CE',
  cream: '#FBFAF7',
}

export function PropelLanding() {
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.green, color: C.cream }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.svg" alt="" width={40} height={28} priority />
          <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="opacity-90 hover:opacity-100">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.ink, color: C.cream }}
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest" style={{ color: C.mintLight }}>
            AI-native CRM
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Propel your pipeline forward
          </h1>
          <p className="mt-6 text-lg opacity-90 md:text-xl">{APP_TAGLINE}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
              style={{ backgroundColor: C.ink, color: C.cream }}
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold"
              style={{ borderColor: C.mintLight, color: C.cream }}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, title: 'Contacts & deals', desc: 'Multi-tenant CRM with pipelines, scoring, and collaboration.' },
            { icon: Mail, title: 'Outbound-native', desc: 'Gmail sync, sequences, tracking, and booking links built in.' },
            { icon: Bot, title: 'AI assistant', desc: 'Tool-using agent over your CRM data — draft, search, next best action.' },
            { icon: BarChart3, title: 'Reports & goals', desc: 'Dashboards, forecasts, and rep targets in one place.' },
            { icon: Shield, title: 'Enterprise-ready', desc: 'MFA, SSO, SCIM, RBAC, and GDPR tooling.' },
          ].map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-2xl p-6"
              style={{ backgroundColor: 'rgba(12, 31, 26, 0.35)' }}
            >
              <Icon className="mb-4 h-8 w-8" style={{ color: C.mintLight }} />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm opacity-85">{desc}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm opacity-70">
        © {new Date().getFullYear()} {APP_NAME}
      </footer>
    </div>
  )
}
