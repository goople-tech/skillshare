import { test, expect } from './helpers/authSession'
import type { DiscoveryPage, Exchange } from '../src/components/skillshare/discoverySource'

const publicProfile = (id: number, name: string) => ({ id, name, bio: 'Public matching bio', courses: 'CPSC 210', interests: 'hackathons', skills_teach: 'Guitar, Statistics', skills_learn: 'Python', mode: 'online', energy: 'medium' })
const result = {
  profile: publicProfile(2, 'API Tutor'), categories: ['music'], they_teach_me: ['Guitar'], i_teach_them: ['Python'], mutual: true,
  reasons: ['Can teach you Guitar'], rating: { average: null as number | null, completed_reviews: 0 },
}
const discovery = { results: [result], count: 1, limit: 24 }
const unfinished: Exchange = { id: 1, partner: publicProfile(2, 'API Tutor'), scheduled_for: '2026-11-01T12:00:00Z', review: { status: 'awaiting_completion', can_rate: false, can_confirm_completion: true, acknowledged_by_me: false, acknowledged_by_peer: false } }
const eligible: Exchange = { ...unfinished, review: { ...unfinished.review, status: 'eligible', can_rate: true, can_confirm_completion: false, acknowledged_by_me: true, acknowledged_by_peer: true } }
const submitted: Exchange = { ...eligible, review: { ...eligible.review, status: 'submitted', values: { learned: 5, taught: 4, collaboration: 3 } } }

async function mockApi(page: import('@playwright/test').Page) {
  const queries: string[] = []
  const exchanges: Exchange[] = [unfinished]
  let rated = false
  await page.route('http://localhost:5175/skillshare/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    if (path.endsWith('/skillshare/discover')) { queries.push(url.search); await route.fulfill({ json: url.searchParams.get('seeking') === 'No such skill' ? { results: [], count: 0, limit: 24 } as DiscoveryPage : discovery }); return }
    if (path.endsWith('/skillshare/catalog')) { await route.fulfill({ json: { skills: ['Guitar', 'Python'] } }); return }
    if (path.endsWith('/skillshare/exchanges') && request.method() === 'GET') { await route.fulfill({ json: exchanges }); return }
    if (path.endsWith('/skillshare/exchanges/1/completion')) { exchanges[0] = eligible; await route.fulfill({ json: eligible }); return }
    if (path.endsWith('/skillshare/exchanges/1/review')) { rated = true; exchanges[0] = submitted; await route.fulfill({ json: { exchange_id: 1, ...request.postDataJSON(), updated_at: '2026-11-08T00:00:00Z' } }); return }
    await route.fulfill({ status: 404, json: { detail: 'Unsupported test API' } })
  })
  await page.route('http://localhost:5175/swipe/**', route => route.fulfill({ json: route.request().url().includes('/deck') ? [{ profile: result.profile, reasons: ['Can teach you Guitar'] }] : [] }))
  return { queries, rated: () => rated }
}

test('authenticated discovery sends real filters, supports reversible dismissal and native deck navigation', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/skillshare')
  await expect(page.getByRole('heading', { name: 'Find someone to learn with', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profile menu' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'API Tutor', exact: true })).toBeVisible()
  await expect(page.getByText('No ratings yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rate this exchange', exact: true })).toHaveCount(0)
  await page.getByLabel('Skill they can teach').fill('Guitar')
  await expect.poll(() => api.queries.some(query => query.includes('seeking=Guitar'))).toBe(true)
  await page.getByLabel('Meeting preference').selectOption('online')
  await expect.poll(() => api.queries.some(query => query.includes('meeting=online'))).toBe(true)
  await page.getByLabel('Broad category').selectOption('music')
  await expect.poll(() => api.queries.some(query => query.includes('category=music'))).toBe(true)
  await page.getByLabel('Skill they can teach').fill('No such skill')
  await expect(page.getByText('No exchanges match those filters.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('heading', { name: 'API Tutor', exact: true })).toBeVisible()
  const dismiss = page.getByRole('button', { name: 'Dismiss swipe discovery', exact: true })
  await expect(dismiss).toBeVisible()
  const closeBounds = await dismiss.boundingBox()
  const titleBounds = await page.getByRole('heading', { name: 'Swipe to find your learning partner' }).boundingBox()
  expect(closeBounds && titleBounds && closeBounds.y >= titleBounds.y && closeBounds.y + closeBounds.height <= titleBounds.y + titleBounds.height).toBe(false)
  await dismiss.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Restore swipe discovery' })).toBeVisible()
  await expect(page.getByLabel('Skill they can teach')).toHaveValue('')
  await page.getByRole('button', { name: 'Restore swipe discovery' }).click()
  await dismiss.focus(); await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Restore swipe discovery' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore swipe discovery' }).click()
  await page.getByRole('button', { name: 'Open the SkillShare deck' }).click()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'API Tutor', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('completion, protected rating state and header geometry are supported end to end with protected identity mocks', async ({ page }) => {
  const api = await mockApi(page)
  await page.goto('/skillshare')
  await expect(page.getByRole('button', { name: 'Confirm lesson completed' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rate this exchange', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm lesson completed' }).click()
  await page.getByRole('button', { name: 'Rate this exchange', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'How did this lesson go?' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Learned something useful' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Taught clearly' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Collaboration worked well' })).toBeVisible()
  await dialog.getByRole('radio', { name: '5 · Excellent' }).first().check()
  await page.getByRole('button', { name: 'Submit rating' }).click()
  await expect.poll(api.rated).toBe(true)
  await expect(page.getByRole('button', { name: 'Edit rating' })).toBeVisible()
  await expect(page.getByText('Rating submitted', { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Edit rating' }).click()
  await expect(page.getByRole('dialog').getByRole('radio', { name: '5 · Excellent' }).first()).toBeChecked()
  await page.keyboard.press('Escape')
  for (const width of [1440, 1260, 1210, 1200, 1101, 1100, 679, 680, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } }
      const avatar = rect('.profile-nav-avatar'); const caret = rect('.profile-menu-trigger > svg'); const bell = rect('.notification-btn'); const search = rect('[data-testid="workspace-search-trigger"]')
      return { avatar, caret, bell, search, viewport: innerWidth, scroll: document.documentElement.scrollWidth, bellDisplay: getComputedStyle(document.querySelector('.notification-btn')!).display, searchDisplay: getComputedStyle(document.querySelector('[data-testid="workspace-search-trigger"]')!).display }
    })
    expect(geometry.scroll).toBe(width)
    expect(Math.abs((geometry.avatar!.top + geometry.avatar!.bottom) / 2 - (geometry.caret!.top + geometry.caret!.bottom) / 2)).toBeLessThanOrEqual(1)
    if (geometry.searchDisplay !== 'none') expect(geometry.search!.right).toBeLessThanOrEqual(geometry.bell!.left)
    if (width === 1440) await page.screenshot({ path: 'artifacts/skillshare-desktop.png', fullPage: true })
    if (width === 390) await page.screenshot({ path: 'artifacts/skillshare-mobile.png', fullPage: true })
  }
})

test('service errors are explicit and recoverable without fabricated results', async ({ page }) => {
  await page.route('http://localhost:5175/skillshare/discover**', route => route.fulfill({ status: 503, json: { detail: 'Temporarily unavailable' } }))
  await page.route('http://localhost:5175/skillshare/catalog', route => route.fulfill({ json: { skills: [] } }))
  await page.route('http://localhost:5175/skillshare/exchanges', route => route.fulfill({ json: [] }))
  await page.route('http://localhost:5175/swipe/**', route => route.fulfill({ json: [] }))
  await page.goto('/skillshare')
  await expect(page.getByRole('heading', { name: 'Find someone to learn with' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Temporarily unavailable' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'API Tutor', exact: true })).toHaveCount(0)
  await page.unroute('http://localhost:5175/skillshare/discover**')
  await page.route('http://localhost:5175/skillshare/discover**', route => route.fulfill({ json: discovery }))
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'API Tutor', exact: true })).toBeVisible()
})
