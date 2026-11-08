import { test, expect } from '@playwright/test'

// All identity/API fixtures exist only in this browser test.
const person = { id: 27, name: 'Jamie Example' }
const apiBase = 'http://127.0.0.1:8008'
function conversations(kind: 'buddy' | 'skill') {
  return [{ id: 7, kind, participant: person, last_message_id: 8, latest_message_preview: 'Library later?', last_message_at: '2026-11-01T10:00:00Z', unread_count: 1 }]
}
function history(kind: 'buddy' | 'skill') {
  return { conversation_id: 7, kind, participant: person, messages: [{ id: 8, conversation_id: 7, kind, body: '<b>Plain text, not HTML</b>', created_at: '2026-11-01T10:00:00Z', mine: false, sender: person }], has_earlier: false, next_before: null }
}
async function mockApi(page: import('@playwright/test').Page, kind: 'buddy' | 'skill', failFirstSend = false) {
  let sendAttempts = 0
  await page.route('**/api/client-config', route => route.fulfill({ json: { apiUrl: apiBase, auth0Domain: 'preview.invalid', auth0ClientId: 'preview' } }))
  await page.route(`${apiBase}/conversations?*`, route => route.fulfill({ json: conversations(kind) }))
  await page.route(`${apiBase}/conversations/7/messages*`, route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: history(kind) })
    sendAttempts += 1
    if (failFirstSend && sendAttempts === 1) return route.fulfill({ status: 503, json: { detail: 'Campus service unavailable.' } })
    const body = route.request().postDataJSON().body.trim()
    return route.fulfill({ status: 201, json: { id: 9, conversation_id: 7, kind, body, created_at: '2026-11-01T10:01:00Z', mine: true, sender: { id: 1, name: 'Reviewer' } } })
  })
  await page.route(`${apiBase}/conversations/7/read`, route => route.fulfill({ json: { conversation_id: 7, last_read_message_id: 8, read_at: '2026-11-01T10:30:00Z', unread_count: 0 } }))
  return () => sendAttempts
}
test('route pair supports mobile select/back, accessible labels and text-only history', async ({ page }) => {
  await mockApi(page, 'skill')
  await page.goto('/skillshare/messages')
  await expect(page.getByRole('heading', { name: 'SkillShare exchanges' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Messages', exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('messaging-desktop-skill.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: /Jamie Example/ }).click()
  await expect(page).toHaveURL(/\/skillshare\/messages\?conversation=7$/)
  await expect(page.getByRole('group', { name: 'Message history with Jamie Example' })).toBeVisible()
  await expect(page.getByText('<b>Plain text, not HTML</b>')).toBeVisible()
  await expect(page.locator('.messaging-history b')).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to connections' }).click()
  await expect(page.getByRole('button', { name: /Jamie Example/ })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: test.info().outputPath('messaging-mobile-list.png'), fullPage: true })
})
test('match partner links resolve the actual server conversation ID, never partner identity', async ({ page }) => {
  await mockApi(page, 'buddy')
  await page.goto('/buddies/messages?participant=27')
  await expect(page).toHaveURL(/\/buddies\/messages\?conversation=7$/)
  await expect(page.getByRole('heading', { name: 'Jamie Example' })).toBeVisible()
})
test('buddy failure preserves draft, retry commits once, and mobile composer fits', async ({ page }) => {
  const attempts = await mockApi(page, 'buddy', true)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/buddies/messages?conversation=7')
  const draft = page.getByLabel('Message Jamie Example')
  await draft.fill('Meet at the library')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Campus service unavailable')
  await expect(draft).toHaveValue('Meet at the library')
  await expect(page.locator('.messaging-messages li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(draft).toHaveValue('')
  expect(attempts()).toBe(2)
  await expect(page.locator('.messaging-messages li')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  const rectangle = await page.locator('.messaging-composer').boundingBox()
  expect(rectangle).not.toBeNull()
  expect(rectangle!.y + rectangle!.height).toBeLessThan(840)
  await page.screenshot({ path: test.info().outputPath('messaging-mobile-conversation.png'), fullPage: true })
})
