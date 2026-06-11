import { describe, expect, it, vi } from 'vitest'
import { resolveRequestId, captureException } from './observability.js'

describe('resolveRequestId', () => {
  it('reuses a well-formed incoming request id', () => {
    expect(resolveRequestId('abc-123_DEF.45')).toBe('abc-123_DEF.45')
  })
  it('takes the first value when given an array', () => {
    expect(resolveRequestId(['first-id', 'second'])).toBe('first-id')
  })
  it('generates a UUID when missing', () => {
    const id = resolveRequestId(undefined)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('rejects malformed / oversized / injection-y ids and generates instead', () => {
    expect(resolveRequestId('has spaces')).toMatch(/^[0-9a-f-]{36}$/)
    expect(resolveRequestId('a\nb')).toMatch(/^[0-9a-f-]{36}$/)
    expect(resolveRequestId('x'.repeat(200))).toMatch(/^[0-9a-f-]{36}$/)
    expect(resolveRequestId('')).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('captureException', () => {
  it('emits a structured error log with context', () => {
    const log = { error: vi.fn() }
    captureException(log, new Error('boom'), { requestId: 'r1', method: 'POST', route: '/x', orgId: 'o1', statusCode: 500 })
    expect(log.error).toHaveBeenCalledTimes(1)
    const [obj, msg] = log.error.mock.calls[0]!
    expect(msg).toBe('unhandled_error')
    expect(obj).toMatchObject({ evt: 'unhandled_error', requestId: 'r1', route: '/x', orgId: 'o1', statusCode: 500 })
    expect((obj as { err: { message: string } }).err.message).toBe('boom')
  })
  it('coerces non-Error throws', () => {
    const log = { error: vi.fn() }
    captureException(log, 'string failure')
    expect((log.error.mock.calls[0]![0] as { err: { message: string } }).err.message).toBe('string failure')
  })
})
