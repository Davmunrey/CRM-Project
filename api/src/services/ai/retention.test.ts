import { describe, expect, it } from 'vitest'
import { purgeExpiredAiData } from './retention.js'

// With AI_MESSAGE_RETENTION_DAYS unset (default 0) retention is OFF, so the
// purge must be a pure no-op that never touches the database.
describe('purgeExpiredAiData (retention disabled)', () => {
  it('is a no-op returning zero counts when retention is 0', async () => {
    const result = await purgeExpiredAiData()
    expect(result).toEqual({ conversations: 0, messages: 0, usage: 0 })
  })
})
