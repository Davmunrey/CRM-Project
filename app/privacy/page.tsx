import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage, PageHero, Prose, H2, MONO } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'Privacy Policy · Propel',
  description: 'How Propel collects, uses, and protects personal data, and the rights you have under the GDPR.',
}

export default function PrivacyPage() {
  return (
    <MarketingPage>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <Prose>
        <p style={{ ...MONO, fontSize: 12.5, color: '#A6ABA4', marginTop: 0 }}>Last updated: 27 June 2026</p>
        <p>
          This Privacy Policy explains how Propel (&ldquo;Propel&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and
          protects personal data when you use our website and the Propel CRM (the &ldquo;Service&rdquo;). We act as a
          <strong> data controller</strong> for our website and account data, and as a <strong>data processor</strong> for the
          customer data you store in the Service. For processor terms, see our <Link href="/gdpr" style={{ color: '#0C8A68' }}>GDPR &amp; DPA</Link> page.
        </p>

        <H2>1. Data we collect</H2>
        <ul>
          <li><strong>Account data</strong> — name, work email, organization, and authentication metadata.</li>
          <li><strong>Customer data</strong> — contacts, deals, activities, and content you create in the Service.</li>
          <li><strong>Usage data</strong> — device, browser, pages viewed, and feature interactions, used to improve the product.</li>
          <li><strong>Communications</strong> — messages you send us via forms or email.</li>
        </ul>

        <H2>2. How we use data</H2>
        <p>We process personal data to provide and secure the Service, authenticate users, respond to enquiries, comply with legal obligations, and improve the product. We rely on the following legal bases under the GDPR: performance of a contract, legitimate interests, consent (where required), and legal obligation.</p>

        <H2>3. AI processing</H2>
        <p>Propel offers AI features (drafting, scoring, summaries). Prompts and the minimum necessary context are sent to our AI sub-processors solely to return a result to you. <strong>We do not use your customer data to train foundation models</strong>, and AI spend is bounded by the caps you configure.</p>

        <H2>4. Sub-processors &amp; storage</H2>
        <p>We host data with infrastructure providers in the <strong>European Union</strong> and use a limited set of sub-processors for hosting, email delivery, and AI inference. Each is bound by data-protection terms. A current list is available on request via <a href="mailto:privacy@propeltech.es" style={{ color: '#0C8A68' }}>privacy@propeltech.es</a>.</p>

        <H2>5. Retention</H2>
        <p>We keep personal data for as long as your account is active and as required to meet legal obligations. On account closure, customer data is deleted or anonymized within 90 days, unless a longer period is legally required.</p>

        <H2>6. Your rights</H2>
        <p>Subject to the GDPR, you may request access, rectification, erasure, restriction, portability, and objection, and may withdraw consent at any time. To exercise these rights, contact <a href="mailto:privacy@propeltech.es" style={{ color: '#0C8A68' }}>privacy@propeltech.es</a>. You also have the right to lodge a complaint with your supervisory authority (in Spain, the AEPD).</p>

        <H2>7. Security</H2>
        <p>We apply encryption in transit, tenant isolation via row-level security, least-privilege access, and audit logging. No system is perfectly secure, but security is a default in how we build.</p>

        <H2>8. Changes</H2>
        <p>We may update this policy and will revise the &ldquo;last updated&rdquo; date above. Material changes will be communicated through the Service or by email.</p>

        <H2>9. Contact</H2>
        <p>Questions about this policy? Email <a href="mailto:privacy@propeltech.es" style={{ color: '#0C8A68' }}>privacy@propeltech.es</a> or visit our <Link href="/contact" style={{ color: '#0C8A68' }}>contact page</Link>.</p>

        <p style={{ ...MONO, fontSize: 12, color: '#C2B8A6', marginTop: 36, background: '#FBF7EE', border: '1px solid #EDE4D2', borderRadius: 10, padding: '12px 14px' }}>
          This template is provided for product completeness and is not legal advice. Have it reviewed by qualified counsel before relying on it in production.
        </p>
      </Prose>
    </MarketingPage>
  )
}
