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

    it('returns an optimistic contact with a generated id', () => {
      const { addContact } = useContactsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...contactData } = sampleContact
      const result = addContact(contactData)
      expect(result.id).toBeTruthy()
      expect(result.email).toBe('ana@test.com')
    })

    it('prepends the new contact so it appears first in the list', () => {
      const existing = { ...sampleContact, id: 'c-existing', firstName: 'Bob' }
      useContactsStore.setState({ contacts: [existing] })
      const { addContact } = useContactsStore.getState()
      const { id: _id, createdAt: _c, updatedAt: _u, ...contactData } = sampleContact
      addContact(contactData)
      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(2)
      expect(contacts[0].firstName).toBe('Ana')
    })
  })

  describe('fetchContacts', () => {
    it('loads contacts from the API and stores them', async () => {
      const { api } = await import('../../src/lib/api')
      const rows = [
        { ...sampleContact, id: 'c-api-1' },
        { ...sampleContact, id: 'c-api-2', firstName: 'Marco' },
      ]
      vi.mocked(api.get).mockResolvedValueOnce(rows as never)
      await useContactsStore.getState().fetchContacts()
      const { contacts, isLoading } = useContactsStore.getState()
      expect(isLoading).toBe(false)
      expect(contacts).toHaveLength(2)
      expect(contacts[0].id).toBe('c-api-1')
    })

    it('sets error state when API fetch fails', async () => {
      const { api } = await import('../../src/lib/api')
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
      await useContactsStore.getState().fetchContacts()
      const { error, isLoading } = useContactsStore.getState()
      expect(isLoading).toBe(false)
      expect(error).toBeTruthy()
    })
  })

  describe('updateContact', () => {
    it('updates the matching contact in place', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      useContactsStore.getState().updateContact('c-1', { firstName: 'Updated' })
      const { contacts } = useContactsStore.getState()
      expect(contacts[0].firstName).toBe('Updated')
    })

    it('leaves other contacts untouched when updating one', () => {
      const c2 = { ...sampleContact, id: 'c-2', firstName: 'Carlos' }
      useContactsStore.setState({ contacts: [sampleContact, c2] })
      useContactsStore.getState().updateContact('c-1', { firstName: 'New Name' })
      const { contacts } = useContactsStore.getState()
      expect(contacts.find((c) => c.id === 'c-2')?.firstName).toBe('Carlos')
    })

    it('updates multiple fields in a single call', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      useContactsStore.getState().updateContact('c-1', { firstName: 'New', jobTitle: 'CTO' })
      const { contacts } = useContactsStore.getState()
      expect(contacts[0].firstName).toBe('New')
      expect(contacts[0].jobTitle).toBe('CTO')
    })
  })

  describe('deleteContact', () => {
    it('removes the contact from the array', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      useContactsStore.getState().deleteContact('c-1')
      expect(useContactsStore.getState().contacts).toHaveLength(0)
    })

    it('only removes the targeted contact when multiple exist', () => {
      const c2 = { ...sampleContact, id: 'c-2', firstName: 'Carlos' }
      useContactsStore.setState({ contacts: [sampleContact, c2] })
      useContactsStore.getState().deleteContact('c-1')
      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].id).toBe('c-2')
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

    it('filters by search term on email', () => {
      const c1 = { ...sampleContact, id: 'c-1', email: 'ana@acme.com' }
      const c2 = { ...sampleContact, id: 'c-2', email: 'bob@other.com' }
      useContactsStore.setState({
        contacts: [c1, c2],
        filters: { ...emptyFilters, search: 'acme' },
      })
      const result = useContactsStore.getState().getFilteredContacts()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c-1')
    })

    it('returns all contacts when filters are empty', () => {
      const c1 = { ...sampleContact, id: 'c-1' }
      const c2 = { ...sampleContact, id: 'c-2' }
      useContactsStore.setState({ contacts: [c1, c2], filters: emptyFilters })
      expect(useContactsStore.getState().getFilteredContacts()).toHaveLength(2)
    })
  })

  describe('bulkDelete', () => {
    it('removes all targeted contacts at once', () => {
      const c2 = { ...sampleContact, id: 'c-2' }
      const c3 = { ...sampleContact, id: 'c-3' }
      useContactsStore.setState({ contacts: [sampleContact, c2, c3] })
      useContactsStore.getState().bulkDelete(['c-1', 'c-2'])
      const { contacts } = useContactsStore.getState()
      expect(contacts).toHaveLength(1)
      expect(contacts[0].id).toBe('c-3')
    })
  })

  describe('getById', () => {
    it('returns the correct contact by id', () => {
      const c2 = { ...sampleContact, id: 'c-2', firstName: 'Marco' }
      useContactsStore.setState({ contacts: [sampleContact, c2] })
      const found = useContactsStore.getState().getById('c-2')
      expect(found?.firstName).toBe('Marco')
    })

    it('returns undefined for an unknown id', () => {
      useContactsStore.setState({ contacts: [sampleContact] })
      expect(useContactsStore.getState().getById('no-such-id')).toBeUndefined()
    })
  })
})
