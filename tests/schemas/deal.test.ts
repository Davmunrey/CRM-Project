import { describe, it, expect } from 'vitest'
import { createDealSchema } from '../../src/lib/schemas/deal'
import { en } from '../../src/i18n/en'

const defaultStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const dealSchema = createDealSchema(en, defaultStages)

const validDeal = {
  title: 'Big Contract',
  value: '5000',
  currency: 'EUR' as const,
  stage: 'lead' as const,
  probability: '20',
  expectedCloseDate: '2026-06-01',
  contactId: '',
  companyId: '',
  assignedTo: 'user-1',
  priority: 'medium' as const,
  source: '',
  notes: '',
}

describe('createDealSchema', () => {
  it('accepts a valid deal payload', () => {
    const result = dealSchema.safeParse(validDeal)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = dealSchema.safeParse({ ...validDeal, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'title')
      expect(issue?.message).toBe(en.formErrors.dealTitleRequired)
    }
  })

  it('rejects empty value', () => {
    const result = dealSchema.safeParse({ ...validDeal, value: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'value')
      expect(issue?.message).toBe(en.formErrors.dealValueRequired)
    }
  })

  it('rejects empty expectedCloseDate', () => {
    const result = dealSchema.safeParse({ ...validDeal, expectedCloseDate: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'expectedCloseDate')
      expect(issue?.message).toBe(en.formErrors.dealExpectedCloseRequired)
    }
  })

  it('rejects empty assignedTo', () => {
    const result = dealSchema.safeParse({ ...validDeal, assignedTo: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'assignedTo')
      expect(issue?.message).toBe(en.formErrors.dealAssignedToRequired)
    }
  })

  it('rejects invalid stage enum value', () => {
    const result = dealSchema.safeParse({ ...validDeal, stage: 'unknown' })
    expect(result.success).toBe(false)
  })
})
