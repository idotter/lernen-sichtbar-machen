import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('WCAG 2.1 AA — Öffentliche Seiten', () => {
  test('Login-Seite hat keine WCAG-Verletzungen', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveURL(/\/auth\/login/)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
