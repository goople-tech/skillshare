import type { ApiAccount, ApiSkillMatch } from './apiTypes'
import type { WorkspaceDataSource } from './dataSource'
import type { Person, ProfileDetails, SkillMatch, WorkspaceSnapshot } from './types'
import { emptySnapshot } from './types'
export type ApiClient = { me(): Promise<ApiAccount>; skillMatches(): Promise<ApiSkillMatch[]>; updateMe(changes: ReturnType<typeof profileToApi>): Promise<ApiAccount> }

const splitSkills = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const connectionPreference = (mode: ApiAccount['mode'], energy: ApiAccount['energy']) => `${energy === 'low' ? 'Quiet sessions' : energy === 'high' ? 'Active collaboration' : 'Flexible pacing'} · ${mode === 'either' ? 'Online or in person' : mode === 'in_person' ? 'In person' : 'Online'}`

/** Translate backend resource shapes once, at the integration boundary. */
export const profileFromApi = (account: ApiAccount, imageUrl?: string): ProfileDetails => ({
  program: account.bio,
  year: '',
  courses: splitSkills(account.courses),
  interests: splitSkills(account.interests),
  teach: splitSkills(account.skills_teach),
  learn: splitSkills(account.skills_learn),
  preference: connectionPreference(account.mode, account.energy),
  imageUrl,
  // Account verification and current-student verification are separate contracts.
  verified: false,
})
export const profileToApi = (profile: ProfileDetails) => ({
  bio: profile.program,
  courses: profile.courses.join(','),
  interests: profile.interests.join(','),
  skills_teach: profile.teach.join(','),
  skills_learn: profile.learn.join(','),
})
export const personFromApi = (account: ApiAccount): Person => {
  const profile = profileFromApi(account)
  return { id: String(account.id), name: account.name, initials: initials(account.name), program: account.bio, year: '', context: account.bio, courses: profile.courses, interests: profile.interests, offers: profile.teach, learns: profile.learn, preference: profile.preference, invited: false }
}
export const skillMatchesFromApi = (matches: ApiSkillMatch[]): SkillMatch[] => matches.map((match) => ({
  id: String(match.user.id), personId: String(match.user.id), name: match.user.name,
  initials: initials(match.user.name), offer: match.i_teach_them[0] ?? '',
  learn: match.they_teach_me[0] ?? '', invited: false,
}))

/**
 * Connector for existing FastAPI profile/matching endpoints. Do not use it for
 * workflows without a backend contract: those mutations fail explicitly.
 */
export class ApiWorkspaceDataSource implements WorkspaceDataSource {
  private client: ApiClient
  constructor(client: ApiClient) { this.client = client }
  readonly kind = 'api' as const
  readonly description = 'Live profile and SkillShare recommendations; other workflows are pending'
  async load(): Promise<WorkspaceSnapshot> {
    const [account, matches] = await Promise.all([this.client.me(), this.client.skillMatches()])
    return {
      ...emptySnapshot, mode: 'live', profile: profileFromApi(account),
      people: matches.map((match) => personFromApi(match.user)), matches: skillMatchesFromApi(matches),
    }
  }
  async updateProfile(profile: ProfileDetails): Promise<ProfileDetails> {
    const account = await this.client.updateMe(profileToApi(profile))
    return profileFromApi(account, profile.imageUrl)
  }
  respondToRequest(): Promise<void> { return this.unsupported('Request responses') }
  connectWithPerson(): Promise<void> { return this.unsupported('Buddy connections') }
  requestSkillExchange(): Promise<void> { return this.unsupported('Exchange requests') }
  markAllActivityRead(): Promise<void> { return this.unsupported('Activity reads') }
  createSkillOffer(): Promise<void> { return this.unsupported('Publishing skill offers') }
  createProjectOffer(): Promise<void> { return this.unsupported('Publishing projects') }
  private unsupported(feature: string): Promise<void> {
    return Promise.reject(new Error(`${feature} need a backend endpoint before they can be used.`))
  }
}
