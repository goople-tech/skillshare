import { describe, expect, it, vi } from 'vitest'
import { ApiDiscoverySource, discoveryQuery, emptyFilters } from './discoverySource'

describe('SkillShare discovery connector', () => {
  it('encodes only active real filters and keeps a bounded server query', () => {
    expect(discoveryQuery(emptyFilters)).toBe('limit=24')
    expect(discoveryQuery({ category: 'music', seeking: 'Guitar & bass', offering: 'C++', meeting: 'online', minimumRating: '4' }))
      .toBe('category=music&seeking=Guitar+%26+bass&offering=C%2B%2B&meeting=online&minimum_rating=4&limit=24')
  })
  it('requests real discovery and protected lesson mutations', async () => {
    const request = vi.fn().mockResolvedValue({ results: [], count: 0, limit: 24 })
    const source = new ApiDiscoverySource(request)
    await source.search(emptyFilters)
    await source.schedule({ partner_id: 2, scheduled_for: '2026-11-08T12:00:00Z' })
    await source.acknowledgeCompletion(4)
    await source.submitReview(4, { learned: 5, taught: 4, collaboration: 3 })
    expect(request.mock.calls.map(([path, options]) => [path, options?.method ?? 'GET'])).toEqual([
      ['/skillshare/discover?limit=24', 'GET'],
      ['/skillshare/exchanges', 'POST'],
      ['/skillshare/exchanges/4/completion', 'PUT'],
      ['/skillshare/exchanges/4/review', 'PUT'],
    ])
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({ partner_id: 2, scheduled_for: '2026-11-08T12:00:00Z' })
  })
})
