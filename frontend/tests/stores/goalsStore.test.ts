import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      post: mockPost,
    },
  }
})


describe('goalsStore', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPost.mockReset()
  })

  it('creates a goal via n0crm-api', async () => {
    const created = {
      id: 'goal-123',
      userId: 'u-test',
      type: 'revenue',
      target: 1000,
      current: 0,
      period: 'monthly',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      organizationId: 'org-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockPost.mockResolvedValue(created)
    const { useGoalsStore } = await import('../../src/store/goalsStore')
    const initial = useGoalsStore.getState().goals.length

    const result = await useGoalsStore.getState().addGoal({
      userId: 'u-test',
      type: 'revenue',
      target: 1000,
      current: 0,
      period: 'monthly',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
    })

    expect(result.error).toBeUndefined()
    expect(result.goal?.id).toBe('goal-123')
    expect(useGoalsStore.getState().goals.length).toBe(initial + 1)
  })
})
