import { describe, expect, it } from 'vitest'
import { loadProjects, MAX_SKILLS, newProject, parseSkills, saveProjects, STORAGE_KEY, teammatesQuery } from './projectStore'

const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } } }

describe('parseSkills', () => {
  it('trims, drops blanks and case/space duplicates', () => {
    expect(parseSkills(' React, , react ,Fast API, fastapi ')).toEqual(['React', 'Fast API'])
  })
  it('caps at MAX_SKILLS', () => {
    expect(parseSkills('a,b,c,d,e,f,g,h')).toHaveLength(MAX_SKILLS)
  })
})

describe('storage', () => {
  it('round-trips projects', () => {
    const store = memory()
    const project = newProject('  Bike map ', 'Find safe routes', 'React, Leaflet', 1)
    expect(saveProjects([project], store)).toBe(true)
    expect(loadProjects(store)).toEqual([project])
    expect(project.title).toBe('Bike map')
  })
  it('ignores corrupt or malformed data', () => {
    const store = memory()
    store.setItem(STORAGE_KEY, '{not json')
    expect(loadProjects(store)).toEqual([])
    store.setItem(STORAGE_KEY, JSON.stringify([{ id: 1 }, newProject('ok', '', 'x', 2)]))
    expect(loadProjects(store).map((p) => p.title)).toEqual(['ok'])
  })
  it('survives missing storage', () => {
    expect(loadProjects(undefined)).toEqual([])
    expect(saveProjects([], undefined)).toBe(false)
  })
})

it('teammatesQuery repeats the skills param', () => {
  expect(teammatesQuery(['React', 'C++'])).toBe('skills=React&skills=C%2B%2B&limit=6')
})
