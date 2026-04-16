import type { SeedDemoCatalog } from '../types'

/** English copy for offline demo entities (seed ids match `src/utils/seedData.ts`). */
export const demoEntityOverlaysEn: Pick<
  SeedDemoCatalog,
  'demoCompanies' | 'demoContacts' | 'demoDeals' | 'demoActivities' | 'demoEmails'
> = {
  demoCompanies: {
    c1: {
      country: 'Spain',
      notes: 'Strategic account. Annual renewal in June.',
    },
    c2: {
      country: 'Spain',
      notes: 'Technology partner. Integration in progress.',
    },
    c3: {
      name: 'Mapfre Innovation',
      country: 'Spain',
      notes: 'Interest in advanced reporting module.',
    },
    c4: {
      country: 'Spain',
      notes: 'Energy scale-up. Expanding to Portugal.',
    },
    c5: {
      country: 'Spain',
      notes: 'Flagship account. Multi-year contract.',
    },
    c6: {
      country: 'Spain',
      notes: 'Very demanding engineering team. POC in progress.',
    },
    c7: {
      country: 'Spain',
      notes: 'Implementation partner. Indirect channel.',
    },
    c8: {
      name: 'Flywire Spain',
      country: 'Spain',
      notes: 'Upsell for international payments module.',
    },
    c9: {
      country: 'Spain',
      notes: 'Long buying cycle. Legal involved.',
    },
    c10: {
      country: 'Spain',
      notes: 'Lost the contract in Q3. Re-engagement planned.',
    },
  },
  demoContacts: {
    ct1: {
      notes: 'Main contact at Bankia. Technical decision maker.',
    },
    ct2: {
      jobTitle: 'Chief Procurement Officer',
      notes: 'Owns contracts. Very strict about SLAs.',
    },
    ct3: {
      notes: 'Very technical. Prefers Slack.',
    },
    ct4: {
      notes: 'Met at SaaStr Annual 2024. Very growth-oriented.',
    },
    ct5: {
      jobTitle: 'Director of Innovation',
      notes: 'Presentation done in January. Expect proposal in March.',
    },
    ct6: {
      notes: 'Budget validation. Long process expected.',
    },
    ct7: {
      notes: 'On free trial. Very active in the dashboard.',
    },
    ct8: {
      notes: 'Executive contact. Quarterly business reviews.',
    },
    ct9: {
      notes: 'Technical counterpart. Evaluates integration architecture.',
    },
    ct10: {
      notes: 'Ex-Amazon. Very performance-focused.',
    },
    ct11: {
      notes: 'Operational contact. Coordinates the POC.',
    },
    ct12: {
      notes: 'Partnership lead. Brings enterprise deals.',
    },
    ct13: {
      notes: 'Delivers implementations with our product.',
    },
    ct14: {
      notes: 'Owns technology budget.',
    },
    ct15: {
      notes: 'Very involved in API integrations.',
    },
    ct16: {
      notes: 'Met at HealthTech Summit. Digital transformation mandate.',
    },
    ct17: {
      notes: 'Evaluates technical architecture of the solution.',
    },
    ct18: {
      notes: 'Moved to a competitor. Possible re-engagement in 2026.',
    },
    ct19: {
      notes: 'Unhappy with support. We need to improve NPS.',
    },
    ct20: {
      notes: 'Inbound from Google Ads campaign. Logistics company.',
    },
    ct21: {
      notes: 'Reached out on LinkedIn. Series A in progress.',
    },
    ct22: {
      notes: 'Referred by Beatriz. LATAM expansion.',
    },
    ct23: {
      notes: 'Very involved in international expansion.',
    },
    ct24: {
      notes: 'Met at MAPFRE hackathon. Internal champion.',
    },
    ct25: {
      notes: 'Manages enterprise contract renewal.',
    },
  },
  demoDeals: {
    d1: {
      title: 'Bankia - Analytics Platform',
      notes: 'Project closed successfully. Includes training.',
    },
    d2: {
      title: 'Bankia - Compliance Module',
      notes: 'Upsell after analytics platform success.',
    },
    d3: {
      title: 'Factorial - HR API Integration',
      notes: 'Negotiating SLA terms. Review exclusivity clause.',
    },
    d4: {
      title: 'Mapfre - Reporting Suite',
      notes: 'Proposal sent. Waiting on legal feedback.',
    },
    d5: {
      title: 'Mapfre - Transformation Consulting',
      notes: 'Opportunity spotted at hackathon. Still exploring.',
    },
    d6: {
      title: 'Holaluz - SaaS Starter',
      notes: 'Came from trial. Demo completed.',
    },
    d7: {
      title: 'Inditex - Global Platform',
      notes: 'Mega deal. 3-year contract.',
    },
    d8: {
      title: 'Inditex - Enterprise Renewal',
      notes: 'Global renewal. Loyalty discount under negotiation.',
    },
    d9: {
      title: 'Cabify - Platform POC',
      notes: 'Technical POC in progress. Results expected in April.',
    },
    d10: {
      title: 'Deloitte - Partnership Deal',
      notes: 'Indirect channel agreement. 15% commission on referred sales.',
    },
    d11: {
      title: 'Flywire - Intl. Payments Module',
      notes: 'Payments upsell. Master agreement already signed.',
    },
    d12: {
      title: 'Flywire - API Integration',
      notes: 'Custom integration. Requires additional development.',
    },
    d13: {
      title: 'Sanitas - Healthcare Digitalization',
      notes: 'Large opportunity. Estimated 6-month sales cycle.',
    },
    d14: {
      title: 'Glovo - Logistics Platform',
      notes: 'Lost to competitor. Price and support were the reasons.',
    },
    d15: {
      title: 'Inditex - Analytics Plus Module',
      notes: 'Identified in QBR. Budget approval pending.',
    },
    d16: {
      title: 'Bankia - Team Training',
      notes: 'Two-day workshop for 30 people.',
    },
    d17: {
      title: 'Factorial - Payroll Module',
      notes: 'Spotted in follow-up meeting. Interest not confirmed yet.',
    },
    d18: {
      title: 'Cabify - Enterprise License',
      notes: 'If POC succeeds, converts to enterprise license.',
    },
  },
  demoActivities: {
    a1: {
      subject: 'Bankia Analytics kick-off',
      description: 'Project kick-off with Bankia technical team.',
      outcome: 'Positive. Team motivated. Roadmap agreed.',
    },
    a2: {
      subject: 'Bankia implementation follow-up call',
      description: 'Follow-up call on implementation progress.',
      outcome: 'On track. Small tweaks to reporting module.',
    },
    a3: {
      subject: 'Bankia Analytics contract close & signature',
      description: 'Email with final paperwork and e-signature link.',
      outcome: 'Contract signed. Deal closed.',
    },
    a4: {
      subject: 'Bankia Compliance module demo',
      description: 'Demo of regulatory compliance module.',
      outcome: 'Interest confirmed. Formal proposal requested.',
    },
    a5: {
      subject: 'Send Bankia Compliance proposal',
      description: 'Prepare and send detailed proposal with price and timeline.',
    },
    a6: {
      subject: 'Factorial SLA negotiation',
      description: 'Call to discuss SLA terms and exclusivity.',
      outcome: 'Agreed 99.9% uptime. Exclusivity declined.',
    },
    a7: {
      subject: 'Factorial contract review',
      description: 'Legal meeting to review final contract.',
    },
    a8: {
      subject: 'Mapfre reporting suite presentation',
      description: 'Full demo of reporting suite for Mapfre team.',
      outcome: 'Very interested. Asked for commercial proposal.',
    },
    a9: {
      subject: 'Mapfre reporting commercial proposal',
      description: 'Sent proposal with cost breakdown and estimated ROI.',
      outcome: 'Received. Under review with legal and finance.',
    },
    a10: {
      subject: 'Mapfre consulting discovery call',
      description: 'Initial call to understand digital transformation needs.',
      outcome: 'Moderate interest. Limited budget initially.',
    },
    a11: {
      subject: 'Holaluz demo follow-up email',
      description: 'Follow-up after online demo. Attached use cases.',
    },
    a12: {
      subject: 'Inditex Q3 QBR',
      description: 'Quarterly business review with Inditex leadership.',
      outcome: 'Excellent. High satisfaction. Two new opportunities identified.',
    },
    a13: {
      subject: 'Inditex Global final negotiation call',
      description: 'Call to align final terms of multi-year agreement.',
      outcome: 'Deal struck. 8% discount in exchange for 3 years.',
    },
    a14: {
      subject: 'Inditex contract signature',
      description: 'Signed documents. Multi-year agreement activated.',
      outcome: 'Deal closed successfully.',
    },
    a15: {
      subject: 'Inditex Q1 2026 QBR',
      description: 'Quarterly review and renewal conversation.',
      outcome: 'Very satisfied. Open to renew with improvements.',
    },
    a16: {
      subject: 'Prepare Inditex renewal proposal',
      description: 'Draft renewal proposal with new features and pricing.',
    },
    a17: {
      subject: 'Cabify technical demo',
      description: 'Deep technical demo with Cabify engineering.',
      outcome: 'Positive. Requested 30-day POC.',
    },
    a18: {
      subject: 'Configure Cabify POC environment',
      description: 'Prepare test environment for POC with Cabify data.',
    },
    a19: {
      subject: 'Deloitte partnership signing meeting',
      description: 'Closing meeting for indirect channel agreement.',
      outcome: 'Agreement signed. Channel live in 30 days.',
    },
    a20: {
      subject: 'Deloitte partner onboarding email',
      description: 'Onboarding materials and partner portal access.',
      outcome: 'Completed.',
    },
    a21: {
      subject: 'Flywire payments negotiation call',
      description: 'Discussion on international payments module terms.',
      outcome: 'Price agreed. Pending legal validation.',
    },
    a22: {
      subject: 'Flywire contract legal review',
      description: 'Coordinate with legal on contract review.',
    },
    a23: {
      subject: 'Flywire API integration proposal',
      description: 'Technical and commercial proposal for custom integration.',
    },
    a24: {
      subject: 'Sanitas digitalization discovery',
      description: 'Initial discovery with Sanitas CDO.',
      outcome: 'Strong opportunity. Clear digital transformation mandate.',
    },
    a25: {
      subject: 'Send healthcare use cases',
      description: 'Prepare and send healthcare-specific use cases.',
    },
    a26: {
      subject: 'Glovo final demo',
      description: 'Final presentation before Glovo purchase decision.',
      outcome: 'Unsatisfactory. Preferred competitor on price.',
    },
    a27: {
      subject: 'Glovo post-mortem analysis',
      description: 'Lost on price (15% higher) and support response time. Actions: improve support SLA and competitive pricing.',
    },
    a28: {
      subject: 'Bankia training workshop',
      description: 'Two-day onsite training session in Madrid.',
      outcome: 'Excellent feedback. NPS 9/10.',
    },
    a29: {
      subject: 'LinkedIn connection — Sofía Moreno',
      description: 'Initial LinkedIn outreach about enterprise license.',
      outcome: 'Accepted meeting. Very receptive.',
    },
    a30: {
      subject: 'Cabify enterprise proposal presentation call',
      description: 'Call to present enterprise license proposal.',
      outcome: 'Very interested. Awaiting POC results.',
    },
  },
  demoEmails: {
    em1: {
      subject: 'Bankia — Compliance module proposal',
      body: 'Sharing the proposal with scope, timeline, and pricing for the Compliance module. If it works for you, let’s review tomorrow at 11:00.',
    },
    em2: {
      subject: 'Re: Bankia — Compliance module proposal',
      body: 'Thanks David. We’re reviewing with legal today and I’ll share comments. So far it looks good.',
    },
    em3: {
      subject: 'Enterprise renewal 2026 — final proposal',
      body: 'Attached final renewal proposal with improved SLA and Q3/Q4 roadmap. Let me know to close this week.',
    },
    em4: {
      subject: 'International payments contract — next steps',
      body: 'Great Cristina. Let’s review legal clauses on Thursday and aim to close next week.',
    },
  },
}
