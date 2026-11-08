import { test, expect } from './helpers/authSession'
import { captureConsoleErrors } from './helpers/errors'

const openPreview = async (page: import('@playwright/test').Page) => {
  await page.goto('/home')
  await page.getByRole('heading', { name: /Requests for you/ }).waitFor()
}
const expectCentered = async (page: import('@playwright/test').Page) => {
  const geometry = await page.getByRole('dialog').evaluate((dialog) => {
    const bounds = dialog.getBoundingClientRect()
    return { left: (bounds.left + bounds.right) / 2, top: (bounds.top + bounds.bottom) / 2, viewport: [innerWidth, innerHeight] }
  })
  expect(Math.abs(geometry.left - geometry.viewport[0] / 2)).toBeLessThan(1.1)
  expect(Math.abs(geometry.top - geometry.viewport[1] / 2)).toBeLessThan(1.1)
}

test('the auth route supplies public runtime configuration before entering the dashboard', async ({ page }) => {
  await page.route('**/presence/**', (route) => route.fulfill({ json: route.request().url().endsWith('/presence/me') ? { sharing: false } : { areas: [], active_students: 0, refresh_seconds: 30, ttl_seconds: 180 } }))
  await page.goto('/auth')
  await page.waitForURL('/home')
  await expect(page.getByRole('heading', { name: /Requests for you/ })).toBeVisible()
  await expect(page.getByText('ClientRuntimeProvider missing')).toHaveCount(0)
})

test('request decisions, centered dialogs, responses and keyboard dismissal work', async ({ page }) => {
  await openPreview(page)
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Dashboard/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your week', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'People you may connect with', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Profile menu' }).click()
  await expect(page.getByTestId('nav-user-email')).toContainText('dashboard-demo@deepspace.test')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('nav-user-email')).toBeHidden()
  const requests = page.locator('#requests')
  await requests.getByRole('button', { name: 'Accept', exact: true }).first().click()
  await expect(requests.getByText('Responded requests (1)')).toBeVisible()
  await requests.getByRole('button', { name: 'Decline', exact: true }).first().click()
  await expect(requests.getByText('Responded requests (2)')).toBeVisible()
  await requests.getByRole('button', { name: 'Accept', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.getByRole('button', { name: 'Share a skill', exact: true }).click()
  await expectCentered(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await requests.locator('summary').click()
  await expect(requests.locator('.request-status--accepted')).toHaveCount(2)
  await expect(requests.locator('.request-status--declined')).toHaveCount(1)
})

test('390px layout, centered notifications/search, and readable controls work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openPreview(page)
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile dashboard navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Notifications, 2 unread', exact: true }).click()
  await expectCentered(page)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Mark all as read' }).click()
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expectCentered(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.locator('.request-content p').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(13)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

test('header controls stay separate and exchange skills share their arrow on desktop', async ({ page }) => {
  await openPreview(page)
  const dimensions = async () => page.evaluate(() => {
    const rect = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect()
      if (!bounds) throw new Error(`Missing ${selector}`)
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
    }
    return {
      root: rect('html'),
      search: rect('[data-testid="workspace-search-trigger"]'), bell: rect('.notification-btn'),
      avatar: rect('.profile-menu-trigger [data-slot="avatar"]'), caret: rect('.profile-menu-trigger > svg'),
      offer: rect('.exchange-skills .exchange-skill:first-child'), arrow: rect('.exchange-skills > svg'),
      learn: rect('.exchange-skills .exchange-skill:last-child'),
    }
  })
  const assertLayout = async () => {
    const geometry = await dimensions()
    expect(geometry.search.right).toBeLessThanOrEqual(geometry.bell.left)
    expect(Math.abs((geometry.avatar.top + geometry.avatar.bottom) / 2 - (geometry.caret.top + geometry.caret.bottom) / 2)).toBeLessThanOrEqual(1)
    expect(geometry.offer.right).toBeLessThanOrEqual(geometry.arrow.left)
    expect(geometry.arrow.right).toBeLessThanOrEqual(geometry.learn.left)
    expect(Math.abs((geometry.arrow.top + geometry.arrow.bottom) / 2 - (geometry.learn.top + geometry.learn.bottom) / 2)).toBeLessThanOrEqual(1)
  }
  await assertLayout()
  for (const width of [1260, 1210, 1200, 1101, 1100, 679]) {
    await page.setViewportSize({ width, height: 900 })
    if (width > 1200) await assertLayout()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
  await page.screenshot({ path: 'test-results/dashboard-alignment-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.locator('html').evaluate(element => element.scrollWidth)).toBe(390)
})

test('profile, offers, connections and exchanges all use the shared data source', async ({ page }) => {
  await page.route('**/presence/**', (route) => route.fulfill({ json: route.request().url().endsWith('/presence/me') ? { sharing: false } : { areas: [], active_students: 0, refresh_seconds: 30, ttl_seconds: 3600 } }))
  const errors = captureConsoleErrors(page)
  await openPreview(page)
  const people = page.getByRole('region', { name: 'Connections' })
  await people.locator('.person-match').filter({ hasText: 'Maya Chen' }).getByRole('button', { name: 'View profile' }).click()
  await expectCentered(page)
  await page.keyboard.press('Escape')
  await people.locator('.person-match').filter({ hasText: 'Maya Chen' }).getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(people.getByRole('button', { name: 'Preview invited', exact: true })).toBeDisabled()
  await people.getByRole('button', { name: 'Send request', exact: true }).click()
  await expect(people.getByRole('button', { name: 'Exchange preview saved', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Share a skill', exact: true }).click()
  await page.getByLabel('I can teach', { exact: true }).fill('Photography')
  await page.getByLabel('I want to learn', { exact: true }).fill('Statistics')
  await page.getByRole('button', { name: 'Add to preview offers' }).click()
  await expect(page.getByRole('button', { name: 'Saved in this preview' })).toBeDisabled()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Your preview offers')).toBeVisible()
  await page.getByLabel('Preview mode').selectOption('empty')
  await expect(page.getByRole('heading', { name: 'Make your profile a starting point' })).toBeVisible()
  await page.getByRole('button', { name: 'Complete profile' }).click()
  await page.getByLabel('Program and year').fill('Computer Science, Second year')
  await page.getByRole('button', { name: 'Save preview profile' }).click()
  await expect(page.locator('#profile-summary')).toContainText('Computer Science · Second year')
  await page.getByRole('button', { name: 'Offer your first skill' }).click()
  await expectCentered(page)
  expect(errors.filter((message) => !message.includes('ERR_CONNECTION_REFUSED'))).toEqual([])
})
