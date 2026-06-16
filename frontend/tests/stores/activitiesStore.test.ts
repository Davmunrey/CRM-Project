import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useActivitiesStore } from '../../src/store/activitiesStore'

vi.mock('../../src/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({
      id: 'a-server-1', type: 'call', subject: 'Follow-up call', description: '',
      status: 'pending', contactId: 'c-1', dealId: undefined, companyId: undefined,
      createdBy: 'user-1', createdAt: new Date().toISOString(),
    }),
    patch: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  decodeToken: vi.fn().mockReturnValue(null),
  isTokenExpired: vi.fn().mockReturnValue(true),
  TOKEN_KEY: 'n0crm_token',
}))

vi.mock('../../src/store/auditStore', () => ({
  useAuditStore: {
    getState: vi.fn().mockReturnValue({ logAction: vi.fn() }),
  },
}))

vi.mock('../../src/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({ currentUser: { id: 'user-1' }, users: [] }),
  },
}))

vi.mock('../../src/lib/supabaseHelpers', () => ({
  getOrgId: vi.fn().mockReturnValue('org-1'),
  getErrorMessage: vi.fn().mockImplementation((e: unknown) => (e instanceof Error ? e.message : String(e))),
}))

// The activitiesStore dynamically imports leadsStore on successful addActivity.
// Stub it so the dynamic import doesn't fail in jsdom.
vi.mock('../../src/store/leadsStore', () => ({
  useLeadsStore: {
    getState: vi.fn().mockReturnValue({ leads: [], recomputeLeadScore: vi.fn() }),
  },
}))

const emptyFilters = {
  search: '',
  type: '',
  status: '',
  contactId: '',
  dealId: '',
  dateFrom: '',
  dateTo: '',
}

const sampleActivity = {
  id: 'a-1',
  type: 'call' as const,
  subject: 'Follow-up call',
  description: 'Discuss renewal',
  status: 'pending' as const,
  contactId: 'c-1',
  dealId: undefined as string | undefined,
  companyId: undefined as string | undefined,
  outcome: undefined as string | undefined,
  dueDate: '2026-06-01',
  completedAt: undefined as string | undefined,
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  useActivitiesStore.setState({
    activities: [],
    filters: emptyFilters,
    selectedId: null,
    isLoading: false,
    error: null,
  })
})

describe('activitiesStore', () => {
  describe('addActivity', () => {
    it('optimistically adds an activity to the array', () => {
      const { addActivity } = useActivitiesStore.getState()
      const { id: _id, createdAt: _c, ...activityData } = sampleActivity
      addActivity(activityData)
      const { activities } = useActivitiesStore.getState()
      expect(activities).toHaveLength(1)
      expect(activities[0].subject).toBe('Follow-up call')
    })

    it('returns an optimistic activity with a generated id', () => {
      const { addActivity } = useActivitiesStore.getState()
      const { id: _id, createdAt: _c, ...activityData } = sampleActivity
      const result = addActivity(activityData)
      expect(result.id).toBeTruthy()
      expect(result.type).toBe('call')
    })

    it('prepends the new activity so it appears first in the list', () => {
      const existing = { ...sampleActivity, id: 'a-existing', subject: 'Older task' }
      useActivitiesStore.setState({ activities: [existing] })
      const { addActivity } = useActivitiesStore.getState()
      const { id: _id, createdAt: _c, ...activityData } = sampleActivity
      addActivity(activityData)
      const { activities } = useActivitiesStore.getState()
      expect(activities).toHaveLength(2)
      expect(activities[0].subject).toBe('Follow-up call')
    })
  })

  describe('fetchActivities', () => {
    it('loads activities from the API and populates the store', async () => {
      const { api } = await import('../../src/lib/api')
      const rows = [
        { ...sampleActivity, id: 'a-api-1' },
        { ...sampleActivity, id: 'a-api-2', subject: 'Demo meeting', type: 'meeting' },
      ]
      vi.mocked(api.get).mockResolvedValueOnce(rows as never)
      await useActivitiesStore.getState().fetchActivities()
      const { activities, isLoading } = useActivitiesStore.getState()
      expect(isLoading).toBe(false)
      expect(activities).toHaveLength(2)
    })

    it('sets error state when API fetch fails', async () => {
      const { api } = await import('../../src/lib/api')
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Timeout'))
      await useActivitiesStore.getState().fetchActivities()
      const { error, isLoading } = useActivitiesStore.getState()
      expect(isLoading).toBe(false)
      expect(error).toBeTruthy()
    })
  })

  describe('completeActivity (mark complete)', () => {
    it('sets status to completed and records completedAt', () => {
      useActivitiesStore.setState({ activities: [sampleActivity] })
      useActivitiesStore.getState().completeActivity('a-1')
      const { activities } = useActivitiesStore.getState()
      expect(activities[0].status).toBe('completed')
      expect(activities[0].completedAt).toBeTruthy()
    })

    it('stores the outcome when provided', () => {
      useActivitiesStore.setState({ activities: [sampleActivity] })
      useActivitiesStore.getState().completeActivity('a-1', 'Left voicemail')
      const { activities } = useActivitiesStore.getState()
      expect(activities[0].outcome).toBe('Left voicemail')
    })

    it('leaves other activities unchanged when completing one', () => {
      const a2 = { ...sampleActivity, id: 'a-2', subject: 'Other task', status: 'pending' as const }
      useActivitiesStore.setState({ activities: [sampleActivity, a2] })
      useActivitiesStore.getState().completeActivity('a-1')
      const { activities } = useActivitiesStore.getState()
      expect(activities.find((a) => a.id === 'a-2')?.status).toBe('pending')
    })
  })

  describe('deleteActivity', () => {
    it('removes the activity from the array', () => {
      useActivitiesStore.setState({ activities: [sampleActivity] })
      useActivitiesStore.getState().deleteActivity('a-1')
      expect(useActivitiesStore.getState().activities).toHaveLength(0)
    })

    it('only removes the targeted activity when multiple exist', () => {
      const a2 = { ...sampleActivity, id: 'a-2', subject: 'Email follow-up' }
      useActivitiesStore.setState({ activities: [sampleActivity, a2] })
      useActivitiesStore.getState().deleteActivity('a-1')
      const { activities } = useActivitiesStore.getState()
      expect(activities).toHaveLength(1)
      expect(activities[0].id).toBe('a-2')
    })
  })

  describe('getActivitiesForContact', () => {
    it('returns only activities linked to the given contact', () => {
      const a1 = { ...sampleActivity, id: 'a-1', contactId: 'c-1' }
      const a2 = { ...sampleActivity, id: 'a-2', contactId: 'c-2' }
      const a3 = { ...sampleActivity, id: 'a-3', contactId: 'c-1' }
      useActivitiesStore.setState({ activities: [a1, a2, a3] })
      const result = useActivitiesStore.getState().getActivitiesForContact('c-1')
      expect(result).toHaveLength(2)
      expect(result.every((a) => a.contactId === 'c-1')).toBe(true)
    })

    it('returns an empty array when the contact has no activities', () => {
      useActivitiesStore.setState({ activities: [sampleActivity] })
      expect(useActivitiesStore.getState().getActivitiesForContact('c-no-match')).toHaveLength(0)
    })
  })

  describe('getFilteredActivities', () => {
    it('filters by activity type', () => {
      const call = { ...sampleActivity, id: 'a-1', type: 'call' as const }
      const email = { ...sampleActivity, id: 'a-2', type: 'email' as const }
      useActivitiesStore.setState({
        activities: [call, email],
        filters: { ...emptyFilters, type: 'call' },
      })
      const result = useActivitiesStore.getState().getFilteredActivities()
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('call')
    })

    it('filters by status', () => {
      const pending = { ...sampleActivity, id: 'a-1', status: 'pending' as const }
      const completed = { ...sampleActivity, id: 'a-2', status: 'completed' as const }
      useActivitiesStore.setState({
        activities: [pending, completed],
        filters: { ...emptyFilters, status: 'completed' },
      })
      const result = useActivitiesStore.getState().getFilteredActivities()
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('completed')
    })

    it('filters by search term on subject', () => {
      const a1 = { ...sampleActivity, id: 'a-1', subject: 'Renewal discussion', description: 'Q3 contract renewal' }
      const a2 = { ...sampleActivity, id: 'a-2', subject: 'Onboarding call', description: 'Initial setup walkthrough' }
      useActivitiesStore.setState({
        activities: [a1, a2],
        filters: { ...emptyFilters, search: 'Renewal' },
      })
      const result = useActivitiesStore.getState().getFilteredActivities()
      expect(result).toHaveLength(1)
      expect(result[0].subject).toBe('Renewal discussion')
    })
  })

  describe('getPendingActivities', () => {
    it('returns only pending activities', () => {
      const pending = { ...sampleActivity, id: 'a-1', status: 'pending' as const }
      const done = { ...sampleActivity, id: 'a-2', status: 'completed' as const }
      useActivitiesStore.setState({ activities: [pending, done] })
      const result = useActivitiesStore.getState().getPendingActivities()
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
    })
  })
})
