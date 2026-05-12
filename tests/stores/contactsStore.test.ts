import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useContactsStore } from '../../src/store/contactsStore'

vi.mock('../../src/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({
      id: 'c-server-1', firstName: 'Ana', lastName: 'García', email: 'ana@test.com',
      phone: '', jobTitle: '', companyId: '', status: 'prospect', source: 'website',
      assignedTo: 'user-1', tags: [], notes: '', linkedDeals: [], lastContactedAt: '',
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

vi.mock('../../src/lib/supabaseHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/supabaseHelpers')>()
  return {
    ...actual,
    getOrgId: vi.fn().mockReturnValue('org-1'),
    sbDelete: vi.fn().mockResolvedValue(undefined),
    sbBulkDelete: vi.fn().mockResolvedValue(undefined),
  }
})

const emptyFilters = {
  search: '',
  status: '',
  source: '',
  tags: [] as string[],
  assignedTo: '',
  dateFrom: '',
  dateTo: '',
}

const sampleContact = {
  id: 'c-1',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@test.com',
  phone: '',
  jobTitle: '',
  companyId: '',
  status: 'prospect' as const,
  source: 'website' as const,
  assignedTo: 'user-1',
  tags: [],
  notes: '',
  linkedDeals: [],
  lastContactedAt: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  useContactsStore.setState({
    contacts: [],
    filters: emptyFilters,
    selectedId: null,
    isLoading: false,
    error: null,
  })
})

describe('contactsStore', () => {
  describe('addContact', () => {
    it('optimistically adds a contact to the array', () => {
      const { addContact } = useContactsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...contactData } = sampleContact
      addContact(contactData)
      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].firstName).toBe('Ana')
    })
  })

  describe('updateContact', () => {
    it('updates the matching contact in place', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      useContactsStore.getState().updateContact('c-1', { firstName: 'Updated' })
      const { contacts } = useContactsStore.getState()
      expect(contacts[0].firstName).toBe('Updated')
    })
  })

  describe('deleteContact', () => {
    it('removes the contact from the array', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      useContactsStore.getState().deleteContact('c-1')
      expect(useContactsStore.getState().contacts).toHaveLength(0)
    })
  })

  describe('getFilteredContacts', () => {
    it('filters by status', () => {
      const c1 = { ...sampleContact, id: 'c-1', status: 'prospect' as const }
      const c2 = { ...sampleContact, id: 'c-2', status: 'customer' as const }
      const c3 = { ...sampleContact, id: 'c-3', status: 'churned' as const }
      useContactsStore.setState({
        contacts: [c1, c2, c3],
        filters: { ...emptyFilters, status: 'prospect' },
      })
      const result = useContactsStore.getState().getFilteredContacts()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c-1')
    })

    it('filters by search term on name', () => {
      const c1 = { ...sampleContact, id: 'c-1', firstName: 'Ana', lastName: 'García', email: 'ana@test.com' }
      const c2 = { ...sampleContact, id: 'c-2', firstName: 'Carlos', lastName: 'López', email: 'carlos@test.com' }
      useContactsStore.setState({
        contacts: [c1, c2],
        filters: { ...emptyFilters, search: 'Ana' },
      })
      const result = useContactsStore.getState().getFilteredContacts()
      expect(result).toHaveLength(1)
      expect(result[0].firstName).toBe('Ana')
    })
  })
})
