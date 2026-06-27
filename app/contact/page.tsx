'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarketingPage, PageHero, DISPLAY, MONO } from '@/components/marketing/chrome'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 15, color: '#0C1F1A',
  background: '#fff', border: '1px solid #E8E5DD', borderRadius: 10, outline: 'none',
}
const labelStyle: React.CSSProperties = { ...DISPLAY, fontSize: 13.5, fontWeight: 600, color: '#3F4D48', marginBottom: 6, display: 'block' }

const channels = [
  ['Sales', 'Talk to us about a demo or a plan.', 'sales@propeltech.es'],
  ['Support', 'Already a customer and need a hand?', 'support@propeltech.es'],
  ['Press & partners', 'Media, integrations, and partnerships.', 'hello@propeltech.es'],
] as const

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = `Propel enquiry from ${form.name || 'website'}`
    const body =
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\n${form.message}`
    window.location.href =
      `mailto:sales@propeltech.es?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <MarketingPage>
      <PageHero
        eyebrow="Contact"
        title="Let's talk pipeline."
        subtitle="Questions about Propel, a demo, or pricing? Send a note and a real human will reply within one business day."
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 32px 90px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }} className="max-md:!grid-cols-1">
        <form onSubmit={onSubmit} style={{ background: '#fff', border: '1px solid #E8E5DD', borderRadius: 18, padding: 30 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="max-md:!grid-cols-1">
            <div>
              <label style={labelStyle} htmlFor="name">Name</label>
              <input id="name" required value={form.name} onChange={set('name')} style={inputStyle} placeholder="Jane Doe" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="email">Work email</label>
              <input id="email" type="email" required value={form.email} onChange={set('email')} style={inputStyle} placeholder="jane@company.com" />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="company">Company</label>
            <input id="company" value={form.company} onChange={set('company')} style={inputStyle} placeholder="Acme Inc." />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="message">How can we help?</label>
            <textarea id="message" required value={form.message} onChange={set('message')} rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell us about your team and what you're looking for…" />
          </div>
          <button type="submit" style={{ ...DISPLAY, fontSize: 15, fontWeight: 600, color: '#fff', background: '#0C8A68', padding: '13px 26px', borderRadius: 10, border: 'none', cursor: 'pointer' }} className="transition-colors hover:!bg-[#0A6E54]">
            Send message
          </button>
          <p style={{ fontSize: 13, color: '#8A938E', marginTop: 14 }}>
            By submitting you agree to our{' '}
            <Link href="/privacy" style={{ color: '#0C8A68' }}>Privacy Policy</Link>.
          </p>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {channels.map(([title, desc, email]) => (
            <div key={title} style={{ background: '#FBFAF7', border: '1px solid #E8E5DD', borderRadius: 14, padding: 22 }}>
              <div style={{ ...DISPLAY, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title}</div>
              <p style={{ fontSize: 14, color: '#5E6B66', margin: '0 0 10px' }}>{desc}</p>
              <a href={`mailto:${email}`} style={{ ...MONO, fontSize: 13.5, color: '#0C8A68', fontWeight: 600 }}>{email}</a>
            </div>
          ))}
          <div style={{ ...MONO, fontSize: 12.5, color: '#A6ABA4', padding: '4px 6px' }}>Propel · Madrid, Spain · propeltech.es</div>
        </div>
      </div>
    </MarketingPage>
  )
}
