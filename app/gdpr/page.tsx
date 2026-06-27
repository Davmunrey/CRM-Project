import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage, PageHero, Prose, H2, MONO } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'GDPR & DPA · Propel',
  description: 'Propel and the GDPR: data residency, sub-processors, data subject rights, and our Data Processing Agreement.',
}

export default function GdprPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Legal"
        title="GDPR & Data Processing"
        subtitle="Propel is built for EU teams. Here is how we meet our obligations under the GDPR and act as your data processor."
      />
      <Prose>
        <p style={{ ...MONO, fontSize: 12.5, color: '#A6ABA4', marginTop: 0 }}>Last updated: 27 June 2026</p>

        <H2>Roles</H2>
        <p>For the personal data your team enters into Propel (contacts, deals, activities), <strong>you are the data controller</strong> and <strong>Propel is the data processor</strong>. For your own account and website data, Propel is the controller — see the <Link href="/privacy" style={{ color: '#0C8A68' }}>Privacy Policy</Link>.</p>

        <H2>Data residency</H2>
        <p>Customer data is stored and processed in the <strong>European Union</strong>. Where a sub-processor operates outside the EU, transfers are protected by Standard Contractual Clauses and supplementary measures.</p>

        <H2>Security measures</H2>
        <ul>
          <li>Encryption in transit (TLS) and at rest.</li>
          <li>Tenant isolation enforced at the database layer with row-level security.</li>
          <li>Least-privilege access controls and audit logging.</li>
          <li>No use of customer data to train foundation models.</li>
        </ul>

        <H2>Sub-processors</H2>
        <p>We use a limited set of vetted sub-processors for hosting, transactional email, and AI inference, each bound by GDPR-compliant terms. A current list is available on request at <a href="mailto:dpo@propeltech.es" style={{ color: '#0C8A68' }}>dpo@propeltech.es</a>. We provide notice of new sub-processors so you may object.</p>

        <H2>Data subject rights</H2>
        <p>Propel provides tools and support to help you respond to access, rectification, erasure, restriction, portability, and objection requests from your contacts. Account-level export and deletion are available in the Service or on request.</p>

        <H2>Data Processing Agreement (DPA)</H2>
        <p>Our DPA forms part of the customer agreement and incorporates the GDPR Article 28 requirements and Standard Contractual Clauses where applicable. To request a signed copy, email <a href="mailto:dpo@propeltech.es" style={{ color: '#0C8A68' }}>dpo@propeltech.es</a>.</p>

        <H2>Breach notification</H2>
        <p>In the event of a personal data breach affecting your data, we will notify you without undue delay and provide the information needed to meet your own notification obligations.</p>

        <H2>Contact</H2>
        <p>Data protection enquiries: <a href="mailto:dpo@propeltech.es" style={{ color: '#0C8A68' }}>dpo@propeltech.es</a>. You may also lodge a complaint with your supervisory authority (in Spain, the Agencia Española de Protección de Datos, AEPD).</p>

        <p style={{ ...MONO, fontSize: 12, color: '#C2B8A6', marginTop: 36, background: '#FBF7EE', border: '1px solid #EDE4D2', borderRadius: 10, padding: '12px 14px' }}>
          This template is provided for product completeness and is not legal advice. Have your DPA and GDPR posture reviewed by qualified counsel before relying on them in production.
        </p>
      </Prose>
    </MarketingPage>
  )
}
