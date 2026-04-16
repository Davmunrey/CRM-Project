import type { SeedDemoCatalog } from '../types'
import { demoEntityOverlaysEn } from './entityOverlaysEn'

export const seedDemo: SeedDemoCatalog = {
  products: {
    'prod-001': {
      name: 'CRM Pro License',
      description: 'Annual CRM Pro license with support included',
    },
    'prod-002': {
      name: 'Basic implementation',
      description: 'Implementation and data migration service',
    },
    'prod-003': {
      name: 'Premium 24/7 support',
      description: 'Priority support with < 2h SLA',
    },
    'prod-004': {
      name: 'Team training',
      description: 'On-site training sessions for sales teams',
    },
    'prod-005': {
      name: 'API integration pack',
      description: 'Integrations with external systems via REST API',
    },
    'prod-006': {
      name: 'On-premise server',
      description: 'Dedicated hardware for local CRM installation',
    },
  },
  emailTemplates: {
    'tpl-001': {
      name: 'First touch',
      subject: 'Great to connect, {{firstName}}',
      body: 'Hi {{firstName}},\n\nI would like to explore how we could work together.\n\nBest regards,\n{{senderName}}',
    },
    'tpl-002': {
      name: 'Meeting follow-up',
      subject: 'Summary of our meeting — {{dealTitle}}',
      body: 'Hi {{firstName}},\n\nThanks for your time. I will send the proposal in the next few days.\n\nBest regards,\n{{senderName}}',
    },
    'tpl-003': {
      name: 'Proposal send',
      subject: 'Commercial proposal — {{dealTitle}}',
      body: 'Hi {{firstName}},\n\nPlease find attached the commercial proposal for {{dealTitle}}.\n\nBest regards,\n{{senderName}}',
    },
    'tpl-004': {
      name: 'Closing the deal',
      subject: 'Next steps to close {{dealTitle}}',
      body: 'Hi {{firstName}},\n\nI wanted to follow up on the proposal for {{dealTitle}}.\n\nBest regards,\n{{senderName}}',
    },
    'tpl-005': {
      name: 'Nurture — value content',
      subject: '{{firstName}}, a resource you may find useful',
      body: 'Hi {{firstName}},\n\nWe published a study that may be relevant for {{company}}.\n\nBest regards,\n{{senderName}}',
    },
  },
  quickReplies: {
    'qr-1': {
      title: 'Quick follow-up',
      body: 'Hi {{firstName}},\n\nJust checking in on this.\n\nBest regards,',
    },
    'qr-2': {
      title: 'Meeting summary',
      body: 'Thanks for your time today.\n\nAs discussed, here are the next steps:\n1) \n2) \n3) \n\nBest,',
    },
  },
  automations: {
    'auto-seed-1': {
      name: 'Send follow-up email',
      description: 'When a deal moves to Proposal, create an email task to send the formal proposal.',
      createActivitySubject: 'Send formal proposal',
    },
    'auto-seed-2': {
      name: 'Notify deal won',
      description: 'Send a notification when a deal is closed successfully.',
      notificationTitle: 'Deal won',
      notificationMessage: 'Congratulations! A deal has been closed successfully.',
    },
    'auto-seed-3': {
      name: 'Post-negotiation task',
      description: 'When a deal enters Negotiation, create a task to review contract terms.',
      createActivitySubject: 'Review contract terms',
    },
  },
  sequences: {
    'seq-001': {
      name: 'Initial outreach',
      description: 'Prospecting sequence for new leads.',
      steps: {
        'step-001-1': {
          subject: 'Great to connect, {{firstName}}',
          bodyTemplate: 'Hi {{firstName}},\n\nI would like to explore how we can collaborate.\n\nBest,\n{{senderName}}',
        },
        'step-001-2': {
          subject: 'Follow-up — {{firstName}}',
          bodyTemplate: 'Hi {{firstName}},\n\nJust wanted to follow up.\n\nBest,\n{{senderName}}',
        },
        'step-001-3': {
          taskDescription: 'Call the contact to schedule a demo.',
        },
      },
    },
    'seq-002': {
      name: 'Re-engagement',
      description: 'Re-engage contacts with no reply for 60+ days.',
      steps: {
        'step-002-1': {
          subject: 'Still interested, {{firstName}}?',
          bodyTemplate: 'Hi {{firstName}},\n\nI wanted to reconnect.\n\nBest,\n{{senderName}}',
        },
        'step-002-2': {
          subject: 'Last follow-up, {{firstName}}',
          bodyTemplate: 'Hi {{firstName}},\n\nThis will be my last email.\n\nAll the best,\n{{senderName}}',
        },
      },
    },
  },
  customFields: {
    'cf-c-01': { label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...' },
    'cf-c-02': {
      label: 'Department',
      options: ['Sales', 'Marketing', 'Technology', 'Finance', 'HR', 'Executive', 'Operations', 'Other'],
    },
    'cf-c-03': { label: 'Tax ID / VAT', placeholder: 'B12345678' },
    'cf-c-04': { label: 'Birthday' },
    'cf-e-01': { label: 'Year founded', placeholder: '2020' },
    'cf-e-02': {
      label: 'Technologies',
      options: ['React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', '.NET', 'AWS', 'Azure', 'GCP', 'Kubernetes'],
    },
    'cf-e-03': { label: 'Company LinkedIn page', placeholder: 'https://linkedin.com/company/...' },
    'cf-d-01': { label: 'Main competitor', placeholder: 'Competitor name' },
    'cf-d-02': {
      label: 'Project type',
      options: ['New', 'Migration', 'Expansion', 'Renewal', 'Consulting'],
    },
    'cf-d-03': { label: 'Requires legal approval' },
    'cf-d-04': { label: 'Approved budget', placeholder: '0.00' },
  },
  ...demoEntityOverlaysEn,
}
