export type DataMode = 'live' | 'sample'
export type RequestStatus = 'pending' | 'accepted' | 'declined'
export type ActionState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string }
export type Person = {
  id: string
  name: string
  initials: string
  program: string
  year: string
  context: string
  courses: string[]
  interests: string[]
  offers: string[]
  learns: string[]
  preference: string
  invited: boolean
}
export type RequestType = 'Buddy request' | 'SkillShare exchange' | 'Project invitation'
export type DashboardRequest = {
  id: string
  type: RequestType
  personId: string
  personName: string
  initials: string
  context: string
  meeting: string
  timestamp: string
  status: RequestStatus
}
export type Activity = { id: string; kind: 'Buddy' | 'SkillShare' | 'Project' | 'Recommendation'; text: string; time: string; unread: boolean }
export type Session = { id: string; type: string; personName: string; activity: string; time: string; format: 'Online' | 'In person' }
export type SkillMatch = { id: string; personId: string; name: string; initials: string; offer: string; learn: string; invited: boolean }
export type ProfileDetails = {
  program: string
  year: string
  courses: string[]
  interests: string[]
  teach: string[]
  learn: string[]
  preference: string
  imageUrl?: string
  verified: boolean
}
export type WorkspaceSnapshot = {
  mode: DataMode
  profile: ProfileDetails
  requests: DashboardRequest[]
  activities: Activity[]
  sessions: Session[]
  people: Person[]
  matches: SkillMatch[]
}
export type WorkspaceData = {
  status: 'loading' | 'ready' | 'error'
  snapshot: WorkspaceSnapshot
  retry: () => Promise<void>
  acceptRequest: (id: string) => Promise<void>
  declineRequest: (id: string) => Promise<void>
  connect: (personId: string) => Promise<void>
  sendExchange: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  setDemoMode: (mode: DataMode | 'empty') => Promise<void>
  busyActions: string[]
  editProfileOpen: boolean
  setEditProfileOpen: (open: boolean) => void
}
export const emptySnapshot: WorkspaceSnapshot = {
  mode: 'sample', profile: { program: '', year: '', courses: [], interests: [], teach: [], learn: [], preference: '', verified: false },
  requests: [], activities: [], sessions: [], people: [], matches: [],
}
