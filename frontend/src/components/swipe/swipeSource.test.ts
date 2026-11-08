import { describe, expect, it } from 'vitest'
import { ApiSwipeSource, PreviewSwipeSource, cardFromApi, type ApiPublicProfile } from './swipeSource'

const profile: ApiPublicProfile = { id: 4, name: 'Maya Chen', bio: 'CS', courses: 'CPSC 213, MATH 200', interests: 'hiking, ', skills_teach: 'python', skills_learn: 'guitar', mode: 'in_person', energy: 'low' }

describe('swipe data source', () => {
  it('maps public profiles to card view models without inventing data', () => {
    const card = cardFromApi(profile, ['Also in CPSC 213'])
    expect(card).toMatchObject({ id: '4', initials: 'MC', courses: ['CPSC 213', 'MATH 200'], interests: ['hiking'], meets: 'In person', pace: 'Quiet sessions', reasons: ['Also in CPSC 213'] })
    expect(card.photo).toBeUndefined()
    expect(Object.keys(card)).not.toContain('email')
  })
  it('calls the backend contract and reports matches only from the server', async () => {
    const calls: Array<[string, unknown]> = []
    const source = new ApiSwipeSource(async <T,>(path: string, options?: { method?: string; body?: string }) => {
      calls.push([path, options?.body && JSON.parse(options.body)])
      if (path === '/swipe') return { matched: true, profile } as T
      return [{ profile, reasons: ['Into hiking'] }] as T
    })
    expect((await source.loadDeck('buddy'))[0].reasons).toEqual(['Into hiking'])
    const outcome = await source.swipe('buddy', '4', 'like')
    expect(outcome.matched).toBe(true)
    expect(outcome.person?.name).toBe('Maya Chen')
    expect(calls).toEqual([['/swipe/buddy/deck', undefined], ['/swipe', { target_id: 4, kind: 'buddy', direction: 'like' }]])
  })
  it('keeps the preview deck local and never claims a match', async () => {
    const source = new PreviewSwipeSource()
    const deck = await source.loadDeck('skill')
    expect(deck.every((card) => card.bio.includes('not a real student'))).toBe(true)
    expect(await source.swipe('skill', deck[0].id, 'like')).toEqual({ matched: false })
    expect((await source.loadDeck('skill')).map((c) => c.id)).not.toContain(deck[0].id)
    expect((await source.loadDeck('buddy')).map((c) => c.id)).toContain(deck[0].id)
  })
  it('resolves only the authorized partner in the same conversation scope', async () => {
    const source = new ApiSwipeSource(async <T,>(path: string) => {
      expect(path).toBe('/conversations?kind=skill')
      return [{ id: 9, kind: 'buddy', participant: { id: 4 } }, { id: 27, kind: 'skill', participant: { id: 5 } }, { id: 42, kind: 'skill', participant: { id: 4 } }] as T
    })
    expect(await source.resolveConversation('skill', '4')).toBe('42')
    await expect(source.resolveConversation('skill', 'missing')).rejects.toThrow('Refresh your matches')
  })
})
