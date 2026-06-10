import { describe, expect, it } from 'vitest'
import { isAllowedSlackUrl } from './slack.js'

// Send-time SSRF allow-list: only Slack incoming-webhook URLs may ever be fetched
// by the server, regardless of how the setting was written.
describe('isAllowedSlackUrl (SSRF allow-list)', () => {
  it('accepts genuine Slack incoming-webhook URLs', () => {
    expect(isAllowedSlackUrl('https://hooks.slack.com/services/T000/B000/XXXX')).toBe(true)
  })

  it('rejects internal / metadata / arbitrary hosts', () => {
    expect(isAllowedSlackUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
    expect(isAllowedSlackUrl('http://localhost:6379/')).toBe(false)
    expect(isAllowedSlackUrl('http://127.0.0.1/')).toBe(false)
    expect(isAllowedSlackUrl('https://internal.svc.cluster.local/')).toBe(false)
  })

  it('rejects look-alike and non-https Slack hosts', () => {
    expect(isAllowedSlackUrl('http://hooks.slack.com/services/x')).toBe(false) // not https
    expect(isAllowedSlackUrl('https://hooks.slack.com.evil.com/services/x')).toBe(false)
    expect(isAllowedSlackUrl('https://evil.com/hooks.slack.com/services/x')).toBe(false)
    expect(isAllowedSlackUrl('https://hooks.slack.com/other/path')).toBe(false)
  })

  it('rejects empty / malformed input', () => {
    expect(isAllowedSlackUrl('')).toBe(false)
    expect(isAllowedSlackUrl('not a url')).toBe(false)
  })
})
