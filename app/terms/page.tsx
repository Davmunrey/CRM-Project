import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPage, PageHero, Prose, H2, MONO } from '@/components/marketing/chrome'

export const metadata: Metadata = {
  title: 'Terms of Service · Propel',
  description: 'The terms that govern your use of Propel, including subscriptions, acceptable use, and liability.',
}

export default function TermsPage() {
  return (
    <MarketingPage>
      <PageHero eyebrow="Legal" title="Terms of Service" />
      <Prose>
        <p style={{ ...MONO, fontSize: 12.5, color: '#A6ABA4', marginTop: 0 }}>Last updated: 27 June 2026</p>
        <p>These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Propel (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms. If you are using Propel on behalf of an organization, you represent that you are authorized to bind that organization.</p>

        <H2>1. Accounts</H2>
        <p>You are responsible for the activity under your account and for keeping your credentials secure. You must provide accurate information and be at least 18 years old or the age of majority in your jurisdiction.</p>

        <H2>2. Subscriptions &amp; billing</H2>
        <p>Paid plans are billed in advance on a recurring basis. Fees are non-refundable except where required by law. We may change pricing with at least 30 days&rsquo; notice; changes apply at your next renewal. Free plans may have usage limits and may change over time.</p>

        <H2>3. Acceptable use</H2>
        <p>You agree not to misuse the Service, including by: sending unlawful or unsolicited bulk messaging in violation of applicable law; uploading malicious code; attempting to breach security or access other tenants&rsquo; data; reverse-engineering the Service; or using it to violate the rights of others.</p>

        <H2>4. Customer data</H2>
        <p>You retain all rights to the data you submit. You grant us a limited license to process it solely to provide the Service. Our handling of personal data is described in our <Link href="/privacy" style={{ color: '#0C8A68' }}>Privacy Policy</Link> and <Link href="/gdpr" style={{ color: '#0C8A68' }}>GDPR &amp; DPA</Link>.</p>

        <H2>5. AI features</H2>
        <p>AI output may be inaccurate or incomplete and must be reviewed before you rely on it. You are responsible for the content you send and the actions you take based on AI suggestions. AI usage may be subject to spend limits and fair-use thresholds.</p>

        <H2>6. Availability</H2>
        <p>We strive for high availability but the Service is provided &ldquo;as is&rdquo; without warranty of uninterrupted operation. We may modify or discontinue features with reasonable notice.</p>

        <H2>7. Termination</H2>
        <p>You may cancel at any time. We may suspend or terminate access for breach of these Terms. On termination, your right to use the Service ends and we will handle your data as described in the Privacy Policy.</p>

        <H2>8. Limitation of liability</H2>
        <p>To the maximum extent permitted by law, Propel is not liable for indirect, incidental, or consequential damages, and our total liability is limited to the amount you paid for the Service in the 12 months preceding the claim.</p>

        <H2>9. Governing law</H2>
        <p>These Terms are governed by the laws of Spain, without regard to conflict-of-law principles, and disputes are subject to the courts of Madrid, unless mandatory consumer law provides otherwise.</p>

        <H2>10. Contact</H2>
        <p>Questions about these Terms? Email <a href="mailto:legal@propeltech.es" style={{ color: '#0C8A68' }}>legal@propeltech.es</a>.</p>

        <p style={{ ...MONO, fontSize: 12, color: '#C2B8A6', marginTop: 36, background: '#FBF7EE', border: '1px solid #EDE4D2', borderRadius: 10, padding: '12px 14px' }}>
          This template is provided for product completeness and is not legal advice. Have it reviewed by qualified counsel before relying on it in production.
        </p>
      </Prose>
    </MarketingPage>
  )
}
