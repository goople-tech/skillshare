import { describe, expect, it } from 'vitest'
import { personFromApi, profileFromApi, profileToApi, skillMatchesFromApi } from './apiDataSource'
import type { ApiAccount } from './apiTypes'

const account: ApiAccount = { id: 7, email: 'test@student.ubc.ca', name: 'Test Student', bio: 'Computer Science', courses: 'CPSC 210, MATH 221', skills_teach: 'Python, UI design', skills_learn: 'Statistics', interests: 'Hiking, board games', mode: 'either', energy: 'low' }
describe('backend resource mapping stays outside React components', () => {
  it('normalizes profile strings and never claims student verification', () => {
    const profile = profileFromApi(account)
    expect(profile.courses).toEqual(['CPSC 210', 'MATH 221'])
    expect(profile.preference).toContain('Quiet sessions')
    expect(profile.verified).toBe(false)
    expect(profileToApi(profile).skills_teach).toBe('Python,UI design')
  })
  it('maps matching responses into explicit offers and expects no endpoint beyond the contract', () => {
    const matches = skillMatchesFromApi([{ user: account, they_teach_me: ['statistics'], i_teach_them: ['Python'], mutual: true }])
    expect(matches[0]).toMatchObject({ personId: '7', offer: 'Python', learn: 'statistics', invited: false })
    expect(personFromApi(account).id).toBe('7')
  })
})
