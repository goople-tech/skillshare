import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppContext } from '../../worker.js'
import { registerFastApiProxy } from './fastapi-proxy'

describe('campus proxy prefix rewriting', () => {
  beforeEach(() => {
    const fetcher = vi.fn<typeof fetch>()
    globalThis.fetch = fetcher as typeof fetch
    vi.mocked(globalThis.fetch).mockImplementation(async () => Response.json({ detail: 'Not logged in' }, { status: 401 }))
  })
  afterEach(() => vi.restoreAllMocks())

  function request(url: string, init?: RequestInit) {
    const app = new Hono<AppContext>()
    registerFastApiProxy(app)
    return app.fetch(new Request(url, init), { VITE_API_URL: 'https://api.example' })
  }

  it('forwards /presence to FastAPI, not its proxy namespace', async () => {
    const response = await request('https://skillshare.app.space/api/campus/presence', {
      method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: '{"lat":0,"lng":0}',
    })
    expect(response.status).toBe(401)
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1)
  })

  it('keeps detailed paths valid without accepting unknown or missing configuration', async () => {
    expect((await request('https://skillshare.app.space/api/campus/me')).status).toBe(401)
    expect((await request('https://skillshare.app.space/api/campus/heatmap')).status).toBe(401)
    expect(vi.mocked(globalThis.fetch).mock.calls.map(call => String(call[0])))
      .toEqual(['https://api.example/presence/me', 'https://api.example/presence/heatmap'])
    expect((await request('https://skillshare.app.space/api/campus/invalid')).status).toBe(404)
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2)
  })
})
