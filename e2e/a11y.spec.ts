import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility (axe)', () => {
  test('login page has no serious or critical violations', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page }).analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect.soft(bad, JSON.stringify(bad, null, 2)).toEqual([])
  })
})
