import { describe, expect, it } from 'vitest'
import { FILTERS, applyFilters } from './filters'
import type { SwipeCardView } from './types'

const card = (id: string, extra: Partial<SwipeCardView>): SwipeCardView => ({ id, name: id, initials: id, bio: '', courses: [], interests: [], teaches: [], learns: [], meets: 'Online or in person', pace: 'Flexible pacing', reasons: [], ...extra })
const cards = [
  card('a', { reasons: ['Also in CPSC 213', 'Into hiking'], meets: 'In person', pace: 'Quiet sessions' }),
  card('b', { reasons: ['Into chess'], meets: 'Online', pace: 'Active collaboration' }),
  card('c', { reasons: ['Skill swap: you both have something to teach', 'Can teach you guitar', 'Wants to learn python'] }),
]

describe('deck filters', () => {
  it('offers six filters per deck', () => {
    expect(FILTERS.buddy).toHaveLength(6)
    expect(FILTERS.skill).toHaveLength(6)
  })
  it('combines filters with AND and keeps server order', () => {
    expect(applyFilters(cards, 'buddy', []).map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(applyFilters(cards, 'buddy', ['interest']).map((c) => c.id)).toEqual(['a', 'b'])
    expect(applyFilters(cards, 'buddy', ['interest', 'quiet']).map((c) => c.id)).toEqual(['a'])
  })
  it('treats "online or in person" as matching both meeting filters', () => {
    expect(applyFilters(cards, 'buddy', ['inPerson']).map((c) => c.id)).toEqual(['a', 'c'])
    expect(applyFilters(cards, 'buddy', ['online']).map((c) => c.id)).toEqual(['b', 'c'])
  })
  it('uses skill reasons for SkillShare filters', () => {
    expect(applyFilters(cards, 'skill', ['swap']).map((c) => c.id)).toEqual(['c'])
    expect(applyFilters(cards, 'skill', ['teachesMe', 'wantsMine']).map((c) => c.id)).toEqual(['c'])
  })
})
