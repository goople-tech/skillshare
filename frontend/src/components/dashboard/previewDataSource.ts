import type { ProfileDetails, WorkspaceSnapshot } from './types'
import { emptySnapshot } from './types'
import { sampleSnapshot } from './sampleData'
import type { WorkspaceDataSource } from './dataSource'

/** In-memory double of the future API boundary. No requests leave the browser. */
export class PreviewWorkspaceDataSource implements WorkspaceDataSource {
  readonly kind = 'preview' as const
  readonly description = 'Preview sample · local actions, not live student data'
  private snapshot: WorkspaceSnapshot = sampleSnapshot

  async load(): Promise<WorkspaceSnapshot> {
    await this.delay()
    return this.snapshot
  }
  async respondToRequest(id: string, status: 'accepted' | 'declined'): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, requests: this.snapshot.requests.map((entry) => entry.id === id ? { ...entry, status } : entry) }
  }
  async updateProfile(profile: ProfileDetails) {
    await this.delay()
    this.snapshot = { ...this.snapshot, profile }
    return profile
  }
  async connectWithPerson(personId: string): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, people: this.snapshot.people.map((person) => person.id === personId ? { ...person, invited: true } : person) }
  }
  async requestSkillExchange(exchangeId: string): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, matches: this.snapshot.matches.map((match) => match.id === exchangeId ? { ...match, invited: true } : match) }
  }
  async markAllActivityRead(): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, activities: this.snapshot.activities.map((activity) => ({ ...activity, unread: false })) }
  }
  async createSkillOffer(offer: Parameters<WorkspaceDataSource['createSkillOffer']>[0]): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, profile: { ...this.snapshot.profile, teach: [...this.snapshot.profile.teach, offer.teach], learn: [...this.snapshot.profile.learn, offer.learn] }, skillOffers: [...this.snapshot.skillOffers, offer] }
  }
  async createProjectOffer(offer: Parameters<WorkspaceDataSource['createProjectOffer']>[0]): Promise<void> {
    await this.delay()
    this.snapshot = { ...this.snapshot, projectOffers: [...this.snapshot.projectOffers, offer] }
  }
  /** Test/demo navigation only. It deliberately is not on the production source contract. */
  setNewStudentMode(isNewStudent: boolean): WorkspaceSnapshot {
    this.snapshot = isNewStudent ? { ...emptySnapshot, profile: this.snapshot.profile } : { ...sampleSnapshot, profile: this.snapshot.profile }
    this.snapshot.mode = 'sample'
    return this.snapshot
  }
  setProfile(profile: WorkspaceSnapshot['profile']): void {
    this.snapshot = { ...this.snapshot, profile }
  }
  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 100))
  }
}
