import { describe, expect, it } from 'vitest'
import { ApiProjectSource, MAX_SKILLS, parseSkills } from './projectStore'
import type { Request } from '../swipe/swipeSource'

describe('parseSkills', () => {
  it('trims, drops blanks and case/space duplicates', () => {
    expect(parseSkills(' React, , react ,Fast API, fastapi ')).toEqual(['React', 'Fast API'])
  })
  it('caps at MAX_SKILLS', () => {
    expect(parseSkills('a,b,c,d,e,f,g,h')).toHaveLength(MAX_SKILLS)
  })
})

describe('ApiProjectSource', () => {
  const recorder = () => {
    const calls: Array<{ path: string; method?: string; body?: unknown }> = []
    const request = (async (path: string, options?: { method?: string; body?: string }) => {
      calls.push({ path, method: options?.method, body: options?.body ? JSON.parse(options.body) : undefined })
      return [] as never
    }) as Request
    return { calls, source: new ApiProjectSource(request) }
  }
  it('uses the backend project endpoints', async () => {
    const { calls, source } = recorder()
    await source.list()
    await source.create({ title: 'Bike map', pitch: '', skills_needed: ['React'] })
    await source.remove(7)
    await source.teammates(7)
    await source.like(3)
    expect(calls).toEqual([
      { path: '/projects', method: undefined, body: undefined },
      { path: '/projects', method: 'POST', body: { title: 'Bike map', pitch: '', skills_needed: ['React'] } },
      { path: '/projects/7', method: 'DELETE', body: undefined },
      { path: '/projects/7/teammates?limit=6', method: undefined, body: undefined },
      { path: '/swipe', method: 'POST', body: { target_id: 3, kind: 'skill', direction: 'like' } },
    ])
  })
})
