import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDealsStore } from '../../src/store/dealsStore'

vi.mock('../../src/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({
      id: 'd-server-1', title: 'Big Contract', value: 5000, currency: 'EUR', stage: 'lead',
      probability: 20, expectedCloseDate: '2026-06-01', contactId: '', companyId: '',
      assignedTo: 'user-1', priority: 'medium', source: '', notes: '', activities: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
  TOKEN_KEY: 'velo_token',
}))

vi.mock('../../src/store/auditStore', () => ({
  useAuditStore: {
    getState: vi.fn().mockReturnValue({ logAction: vi.fn() }),
  },
}))

vi.mock('../../src/store/notificationsStore', () => ({
  useNotificationsStore: {
    getState: vi.fn().mockReturnValue({ notify: vi.fn() }),
  },
}))

vi.mock('../../src/store/automationsStore', () => ({
  useAutomationsStore: {
    getState: vi.fn().mockReturnValue({ triggerAutomation: vi.fn(), executeRulesForTrigger: vi.fn() }),
  },
}))

vi.mock('../../src/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn().mockReturnValue({ currentUser: { id: 'user-1' }, users: [] }),
  },
}))

vi.mock('../../src/lib/supabaseHelpers', () => ({
  getOrgId: vi.fn().mockReturnValue('org-1'),
  sbDelete: vi.fn().mockResolvedValue(undefined),
  getErrorMessage: vi.fn().mockImplementation((e: unknown) => (e instanceof Error ? e.message : String(e))),
  runSupabaseWrite: vi.fn(),
}))

const emptyFilters = {
  search: '',
  stage: '',
  assignedTo: '',
  priority: '',
  valueMin: '',
  valueMax: '',
  dueDateFrom: '',
  dueDateTo: '',
}

const sampleDeal = {
  id: 'd-1',
  title: 'Big Contract',
  value: 5000,
  currency: 'EUR' as const,
  stage: 'lead' as const,
  probability: 20,
  expectedCloseDate: '2026-06-01',
  contactId: '',
  companyId: '',
  assignedTo: 'user-1',
  priority: 'medium' as const,
  source: '',
  notes: '',
  activities: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  useDealsStore.setState({
    deals: [],
    filters: emptyFilters,
    selectedId: null,
    isLoading: false,
    error: null,
    viewMode: 'kanban',
  })
})

describe('dealsStore', () => {
  describe('addDeal', () => {
    it('optimistically adds a deal to the array', () => {
      const { addDeal } = useDealsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...dealData } = sampleDeal
      addDeal(dealData)
      const { deals } = useDealsStore.getState()
      expect(deals).toHaveLength(1)
      expect(deals[0].title).toBe('Big Contract')
    })

    it('returns an optimistic deal with a generated id', () => {
      const { addDeal } = useDealsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...dealData } = sampleDeal
      const result = addDeal(dealData)
      expect(result.id).toBeTruthy()
      expect(result.value).toBe(5000)
    })

    it('prepends the new deal so it appears first in the list', () => {
      const existing = { ...sampleDeal, id: 'd-existing', title: 'Old Deal' }
      useDealsStore.setState({ deals: [existing] })
      const { addDeal } = useDealsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...dealData } = sampleDeal
      addDeal(dealData)
      const { deals } = useDealsStore.getState()
      expect(deals).toHaveLength(2)
      expect(deals[0].title).toBe('Big Contract')
    })
  })

  describe('fetchDeals', () => {
    it('loads deals from the API and stores them', async () => {
      const { api } = await import('../../src/lib/api')
      const rows = [
        { ...sampleDeal, id: 'd-api-1' },
        { ...sampleDeal, id: 'd-api-2', title: 'Second Deal' },
      ]
      vi.mocked(api.get).mockResolvedValueOnce(rows as never)
      await useDealsStore.getState().fetchDeals()
      const { deals, isLoading } = useDealsStore.getState()
      expect(isLoading).toBe(false)
      expect(deals).toHaveLength(2)
    })

    it('sets error state when API fetch fails', async () => {
      const { api } = await import('../../src/lib/api')
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'))
      await useDealsStore.getState().fetchDeals()
      const { error, isLoading } = useDealsStore.getState()
      expect(isLoading).toBe(false)
      expect(error).toBeTruthy()
    })
  })

  describe('updateDeal', () => {
    it('updates the matching deal in place', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().updateDeal('d-1', { title: 'Renamed' })
      const { deals } = useDealsStore.getState()
      expect(deals[0].title).toBe('Renamed')
    })

    it('updates deal value without touching other fields', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().updateDeal('d-1', { value: 9999 })
      const { deals } = useDealsStore.getState()
      expect(deals[0].value).toBe(9999)
      expect(deals[0].title).toBe('Big Contract')
    })
  })

  describe('moveDeal', () => {
    it('moves the deal to the new stage', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().moveDeal('d-1', 'qualified')
      const { deals } = useDealsStore.getState()
      expect(deals[0].stage).toBe('qualified')
    })

    it('marks the deal as closed_won when moved to that stage', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().moveDeal('d-1', 'closed_won')
      const { deals } = useDealsStore.getState()
      expect(deals[0].stage).toBe('closed_won')
    })

    it('marks the deal as closed_lost when moved to that stage', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().moveDeal('d-1', 'closed_lost')
      const { deals } = useDealsStore.getState()
      expect(deals[0].stage).toBe('closed_lost')
    })
  })

  describe('deleteDeal', () => {
    it('removes the deal from the array', () => {
      useDealsStore.setState({ deals: [sampleDeal] })
      useDealsStore.getState().deleteDeal('d-1')
      expect(useDealsStore.getState().deals).toHaveLength(0)
    })

    it('only removes the targeted deal when multiple exist', () => {
      const d2 = { ...sampleDeal, id: 'd-2', title: 'Second Deal' }
      useDealsStore.setState({ deals: [sampleDeal, d2] })
      useDealsStore.getState().deleteDeal('d-1')
      const { deals } = useDealsStore.getState()
      expect(deals).toHaveLength(1)
      expect(deals[0].id).toBe('d-2')
    })
  })

  describe('getFilteredDeals', () => {
    it('filters by stage', () => {
      const d1 = { ...sampleDeal, id: 'd-1', stage: 'lead' as const }
      const d2 = { ...sampleDeal, id: 'd-2', stage: 'qualified' as const }
      useDealsStore.setState({
        deals: [d1, d2],
        filters: { ...emptyFilters, stage: 'lead' },
      })
      const result = useDealsStore.getState().getFilteredDeals()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('d-1')
    })

    it('filters by search term on title', () => {
      const d1 = { ...sampleDeal, id: 'd-1', title: 'Big Contract' }
      const d2 = { ...sampleDeal, id: 'd-2', title: 'Small Project' }
      useDealsStore.setState({
        deals: [d1, d2],
        filters: { ...emptyFilters, search: 'Big' },
      })
      const result = useDealsStore.getState().getFilteredDeals()
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Big Contract')
    })

    it('filters by value range', () => {
      const d1 = { ...sampleDeal, id: 'd-1', value: 1000 }
      const d2 = { ...sampleDeal, id: 'd-2', value: 10000 }
      useDealsStore.setState({
        deals: [d1, d2],
        filters: { ...emptyFilters, valueMin: '5000' },
      })
      const result = useDealsStore.getState().getFilteredDeals()
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(10000)
    })
  })

  describe('getDealsByStage', () => {
    it('returns only deals in the specified stage', () => {
      const d1 = { ...sampleDeal, id: 'd-1', stage: 'lead' as const }
      const d2 = { ...sampleDeal, id: 'd-2', stage: 'qualified' as const }
      const d3 = { ...sampleDeal, id: 'd-3', stage: 'lead' as const }
      useDealsStore.setState({ deals: [d1, d2, d3], filters: emptyFilters })
      const result = useDealsStore.getState().getDealsByStage('lead')
      expect(result).toHaveLength(2)
      expect(result.every((d) => d.stage === 'lead')).toBe(true)
    })
  })

  describe('getPipelineValue', () => {
    it('sums value of all non-closed deals', () => {
      const open = { ...sampleDeal, id: 'd-1', stage: 'lead', value: 3000 }
      const won = { ...sampleDeal, id: 'd-2', stage: 'closed_won', value: 7000 }
      const lost = { ...sampleDeal, id: 'd-3', stage: 'closed_lost', value: 2000 }
      useDealsStore.setState({ deals: [open, won, lost] })
      expect(useDealsStore.getState().getPipelineValue()).toBe(3000)
    })
  })
})
