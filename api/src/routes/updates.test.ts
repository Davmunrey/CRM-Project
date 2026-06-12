import { describe, it, expect } from 'vitest'
import { parseMentions } from './updates.js'

describe('parseMentions', () => {
  const u1 = '11111111-1111-1111-1111-111111111111'
  const u2 = '22222222-2222-2222-2222-222222222222'

  it('extracts a single @[Name](uuid) mention', () => {
    expect(parseMentions(`hey @[Jane Doe](${u1}) please review`)).toEqual([u1])
  })

  it('extracts multiple mentions and de-duplicates', () => {
    const body = `@[Jane](${u1}) and @[Bob](${u2}) and again @[Jane D.](${u1})`
    expect(parseMentions(body).sort()).toEqual([u1, u2].sort())
  })

  it('returns empty when there are no mentions', () => {
    expect(parseMentions('just a plain update with no mentions')).toEqual([])
    expect(parseMentions('an @plain at-sign without the token form')).toEqual([])
  })

  it('ignores malformed tokens (missing parens or bad uuid)', () => {
    expect(parseMentions('@[Jane] (not linked)')).toEqual([])
    expect(parseMentions('@[Jane](not-a-uuid)')).toEqual([])
  })

  it('lowercases the captured uuid for consistent matching', () => {
    expect(parseMentions(`@[Jane](${u1.toUpperCase()})`)).toEqual([u1])
  })
})
