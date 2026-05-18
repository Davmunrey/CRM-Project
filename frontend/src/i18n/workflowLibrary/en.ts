import type { WorkflowLibraryCatalog } from '../types'
import { automationSeedRulesToDemoCatalog, createAutomationSeedRules } from '../seed/automationSeedRulesEn'

const AUTO_TS = '2020-01-01T00:00:00.000Z'

export const workflowLibraryEn: WorkflowLibraryCatalog = {
  automations: automationSeedRulesToDemoCatalog(createAutomationSeedRules(AUTO_TS)),
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
          subject: 'Follow-up - {{firstName}}',
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
    'seq-003': {
      name: 'Post-demo follow-up',
      description: 'Multi-touch nurture after a demo: recap, proof, then a scheduled call.',
      steps: {
        'step-003-1': {
          subject: 'Thanks for the demo - {{firstName}}',
          bodyTemplate:
            'Hi {{firstName}},\n\nThanks for the walkthrough. Here is a short recap of what we covered and the timeline we discussed.\n\nBest,\n{{senderName}}',
        },
        'step-003-2': {},
        'step-003-3': {
          subject: 'Materials you asked for - {{company}}',
          bodyTemplate:
            'Hi {{firstName}},\n\nSharing the references and security overview we promised. Happy to go deeper on any section.\n\nBest,\n{{senderName}}',
        },
        'step-003-4': {
          taskDescription: 'Call to confirm evaluation criteria, security review, and economic buyer.',
        },
      },
    },
    'seq-004': {
      name: 'Land and expand',
      description: 'Warm outreach to existing customers: value recap, social touch, then a commercial expansion ask.',
      steps: {
        'step-004-1': {
          subject: 'Ideas for {{company}} this quarter',
          bodyTemplate:
            'Hi {{firstName}},\n\nBased on how your team is using the product, here are three concrete wins we can unlock without a disruptive migration.\n\nBest,\n{{senderName}}',
        },
        'step-004-2': {
          taskDescription: 'Light-touch LinkedIn engagement with your champion (comment or DM).',
        },
        'step-004-3': {
          subject: 'Expansion options - {{firstName}}',
          bodyTemplate:
            'Hi {{firstName}},\n\nIf you are open to more seats or add-on modules, I can share options aligned to your renewal window.\n\nBest,\n{{senderName}}',
        },
      },
    },
    'seq-005': {
      name: 'Meeting no-show recovery',
      description: 'Polite recovery after a missed meeting: reschedule, a value ping, then phone outreach.',
      steps: {
        'step-005-1': {
          subject: 'Missed you today - want to reschedule?',
          bodyTemplate:
            'Hi {{firstName}},\n\nWe had time blocked and I did not see you join. Here is my calendar link - pick anything that works.\n\nBest,\n{{senderName}}',
        },
        'step-005-2': {
          subject: 'One metric worth 5 minutes - {{firstName}}',
          bodyTemplate:
            'Hi {{firstName}},\n\nQuick note with one benchmark peers in your space track closely. Happy to unpack it live.\n\nBest,\n{{senderName}}',
        },
        'step-005-3': {
          taskDescription: 'Call to confirm priorities and lock a new executive slot.',
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
}
