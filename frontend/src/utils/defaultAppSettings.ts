import type { AppSettings } from '../types'
import { APP_NAME } from '../lib/appIdentity'
import { DEFAULT_ROLE_PERMISSIONS } from './permissionProfiles'

/** Default workspace settings when no server row exists (no demo branding). */
export const defaultAppSettings: AppSettings = {
  currency: 'EUR',
  themePreference: 'system',
  uiDensity: 'comfortable',
  leadSlaHours: 8,
  permissionProfiles: DEFAULT_ROLE_PERMISSIONS,
  branding: {
    appName: APP_NAME,
    primaryColor: '#4f46e5',
    legalName: '',
    country: '',
  },
  tags: [
    'VIP', 'Hot Lead', 'Follow Up', 'Decision Maker', 'Technical',
    'Finance', 'Enterprise', 'SMB', 'Partnership', 'Renewal',
  ],
  pipelineStages: [
    { id: 'lead', name: 'Lead', color: '#3b82f6', order: 0, probability: 10 },
    { id: 'qualified', name: 'Qualified', color: '#f59e0b', order: 1, probability: 25 },
    { id: 'proposal', name: 'Proposal', color: '#8b5cf6', order: 2, probability: 50 },
    { id: 'negotiation', name: 'Negotiation', color: '#f97316', order: 3, probability: 75 },
    { id: 'closed_won', name: 'Won', color: '#10b981', order: 4, probability: 100 },
    { id: 'closed_lost', name: 'Lost', color: '#ef4444', order: 5, probability: 0 },
  ],
  users: [],
  emailIdentities: {},
}
