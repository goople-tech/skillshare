import { test, expect } from '@playwright/test'

// Run against the already-running static preview (Vite on :5174). The full
// DeepSpace smoke config remains untouched because app registration is not
// needed for this public, browser-only layout smoke test.
test('feature cards align and the page stays within its viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('http://127.0.0.1:5174/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '.reveal { animation: none !important; }' })

  for (const width of [1280, 900, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const dimensions = await page.locator('.pathway-card').evaluateAll((cards) =>
      cards.map((card) => {
        const preview = card.querySelector('.mini-interface')!.getBoundingClientRect()
        const cta = card.querySelector('.pathway-link')!.getBoundingClientRect()
        return { previewTop: preview.top, previewHeight: preview.height, ctaBottom: cta.bottom }
      }),
    )
    if (width > 680) {
      expect(dimensions[0].previewTop).toBeCloseTo(dimensions[1].previewTop, 0)
      expect(dimensions[0].previewHeight).toBeCloseTo(dimensions[1].previewHeight, 0)
      expect(dimensions[0].ctaBottom).toBeCloseTo(dimensions[1].ctaBottom, 0)
    } else {
      expect(dimensions[0].ctaBottom).toBeLessThan(dimensions[1].previewTop)
    }
    const viewport = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(viewport).toBe(width)
  }
})


test('opening section occupies the initial viewport without clipping content', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '.reveal { animation: none !important; }' })
  for (const { width, height } of [
    { width: 1280, height: 900 },
    { width: 1280, height: 720 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const bounds = await page.evaluate(() => {
      const hero = document.querySelector('.hero')!.getBoundingClientRect()
      const header = document.querySelector('.site-header')!.getBoundingClientRect()
      const next = document.querySelector('.pathways-section')!.getBoundingClientRect()
      const reassurance = document.querySelector('.hero-reassurance')!.getBoundingClientRect()
      const portrait = document.querySelector('.hero-photo-frame')!.getBoundingClientRect()
      return {
        heroTop: hero.top, heroBottom: hero.bottom, headerBottom: header.bottom,
        nextTop: next.top, reassuranceBottom: reassurance.bottom, portraitBottom: portrait.bottom,
      }
    })
    expect(bounds.heroTop).toBeCloseTo(bounds.headerBottom, 0)
    expect(bounds.heroBottom).toBeGreaterThanOrEqual(height - 1)
    expect(bounds.nextTop).toBeGreaterThanOrEqual(height - 1)
    expect(bounds.reassuranceBottom).toBeLessThanOrEqual(bounds.heroBottom)
    expect(bounds.portraitBottom).toBeLessThanOrEqual(bounds.heroBottom)
  }
})
