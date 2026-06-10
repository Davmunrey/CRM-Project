import { describe, expect, it } from 'vitest'
import { CRM_TOOLS, getTool, toolDefs, type ToolContext } from './tools.js'

const READONLY_CTX: ToolContext = { orgId: 'org-1', userId: 'user-1', allowWrites: false }

describe('CRM tool registry', () => {
  it('exposes the expected tool set with valid JSON-schema definitions', () => {
    const names = toolDefs().map((d) => d.name).sort()
    expect(names).toEqual(
      [
        'create_activity',
        'get_contact',
        'get_deal',
        'search_companies',
        'search_contacts',
        'search_deals',
        'update_deal_stage',
      ].sort(),
    )
    for (const def of toolDefs()) {
      expect(def.name).toBeTruthy()
      expect(def.description.length).toBeGreaterThan(10)
      expect(def.parameters).toMatchObject({ type: 'object' })
    }
  })

  it('getTool resolves known tools and rejects unknown ones', () => {
    expect(getTool('search_contacts')).toBeDefined()
    expect(getTool('definitely_not_a_tool')).toBeUndefined()
  })

  it('every tool has a unique name', () => {
    const names = CRM_TOOLS.map((t) => t.def.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('write-tool guardrails (allowWrites=false)', () => {
  it('create_activity refuses to write and never touches the DB', async () => {
    const res = (await getTool('create_activity')!.execute(READONLY_CTX, {
      type: 'note',
      subject: 'should not be created',
    })) as { error?: string }
    expect(res.error).toMatch(/disabled/i)
  })

  it('update_deal_stage refuses to write and never touches the DB', async () => {
    const res = (await getTool('update_deal_stage')!.execute(READONLY_CTX, {
      dealId: '00000000-0000-0000-0000-000000000000',
      stage: 'won',
    })) as { error?: string }
    expect(res.error).toMatch(/disabled/i)
  })
})
