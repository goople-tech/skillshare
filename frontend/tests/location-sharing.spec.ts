import { test, expect } from './helpers/authSession'

type Point = { lat: number; lng: number }
test('location sharing handles failed POST and restores server choice through reload and explicit stop', async ({ page, baseURL }) => {
  let sharing: { sharing: boolean } & Partial<Point> = { sharing: false }
  let failedOnce = false
  const calls: string[] = []
  await page.route('**/presence/me', async (route) => { calls.push(`GET:${route.request().method()}`); await route.fulfill({ json: sharing }) })
  await page.route('**/presence/heatmap', async (route) => await route.fulfill({ json: { points: sharing.sharing ? [{ lat: sharing.lat, lng: sharing.lng }] : [], refresh_seconds: 30, ttl_seconds: 180 } }))
  await page.route('**/presence', async (route) => {
    const method = route.request().method()
    calls.push(method)
    if (method === 'POST') {
      if (!failedOnce) { failedOnce = true; await route.fulfill({ status: 502, json: { detail: 'Temporarily offline' } }); return }
      sharing = { sharing: true, ...route.request().postDataJSON() as Point }
      await route.fulfill({ json: sharing })
      return
    }
    if (method === 'DELETE') { sharing = { sharing: false }; await route.fulfill({ json: sharing }); return }
    await route.fallback()
  })
  await page.context().grantPermissions(['geolocation'], { origin: baseURL })
  await page.context().setGeolocation({ latitude: 49.2628, longitude: -123.2505 })

  await page.goto('/home')
  await expect(page.getByRole('button', { name: 'Share my location' })).toBeVisible()
  await page.getByRole('button', { name: 'Share my location' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Temporarily offline' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Share my location' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Stop sharing' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Share my location' }).click()
  await expect(page.locator('#campus-activity .live-campus-status').filter({ hasText: 'Location active. Refreshed from the server.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop sharing', exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Stop sharing', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Stop sharing', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Share my location' })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Share my location' })).toBeVisible()
  expect(calls.filter(c => c === 'DELETE')).toHaveLength(1)
  expect(calls.filter(c => c === 'POST')).toHaveLength(2)
})
