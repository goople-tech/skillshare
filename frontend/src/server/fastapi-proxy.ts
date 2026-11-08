import type { Hono } from 'hono'
import type { AppContext } from '../../worker.js'

function backendOrigin(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.origin
  } catch { return null }
}

/** Forward only intended APIs with the caller's verified token to hosted FastAPI. */
export function registerFastApiProxy(app: Hono<AppContext>) {
  const allowed = new Set(['presence', 'presence/me', 'presence/heatmap'])
  app.all('/api/campus/:path{.+}', async (c) => {
    const origin = backendOrigin(c.env.VITE_API_URL)
    if (!origin) return c.json({ detail: 'Campus service is not configured.' }, 503)
    const path = c.req.param('path') || ''
    if (!allowed.has(path)) return c.json({ error: 'not_found' }, 404)
    const headers = new Headers()
    // Forward only expected public API bodies plus caller auth, never internal headers.
    const authorization = c.req.header('Authorization')
    if (authorization) headers.set('authorization', authorization)
    headers.set('content-type', c.req.header('content-type') ?? 'application/json')
    headers.set('accept', 'application/json')
    try {
      const res = await fetch(`${origin}/${path}`, {
        method: c.req.method,
        headers,
        body: c.req.method === 'GET' || c.req.method === 'HEAD' ? undefined : c.req.raw.body,
        redirect: 'manual',
      })
      return new Response(res.body, { status: res.status, headers: new Headers({ 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' }) })
    } catch { return c.json({ detail: 'Campus service unavailable.' }, 502) }
  })
}
