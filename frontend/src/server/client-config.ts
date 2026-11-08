import type { Hono } from 'hono'
import type { AppContext } from '../../worker.js'

function httpsUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null
  } catch { return null }
}

/** Public SPA configuration only. No provider secret is eligible for this route. */
export function registerClientConfigRoute(app: Hono<AppContext>): void {
  app.get('/api/client-config', (c) => {
    const apiUrl = httpsUrl(c.env.VITE_API_URL)
    const domain = c.env.VITE_AUTH0_DOMAIN?.trim()
    const clientId = c.env.VITE_AUTH0_CLIENT_ID?.trim()
    const audience = c.env.VITE_AUTH0_AUDIENCE?.trim()
    if (!apiUrl || !domain || !clientId) return c.json({ error: 'Public app configuration unavailable' }, 503)
    return c.json({ apiUrl, auth0Domain: domain, auth0ClientId: clientId, auth0Audience: audience || undefined }, { headers: { 'Cache-Control': 'no-store' } })
  })
}
