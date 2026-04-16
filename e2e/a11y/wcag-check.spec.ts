import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('WCAG 2.1 AA — Öffentliche Seiten', () => {
  test('Login-Seite hat keine WCAG-Verletzungen', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveURL(/\/auth\/login/)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    if (results.violations.length > 0) {
      const details = results.violations.map(v => `[${v.id}] ${v.description} — ${v.nodes.map(n => n.html).join(', ')}`).join('\n')
      throw new Error(`WCAG-Verletzungen gefunden:\n${details}`)
    }
    expect(results.violations).toEqual([])
  })
})
