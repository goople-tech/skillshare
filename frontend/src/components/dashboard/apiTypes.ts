/** Typed account returned by the backend. Do not reuse it for other students
 * until the backend supplies a deliberately limited public-profile contract. */
export type ApiAccount = {
  id: number
  email: string
  name: string
  bio: string
  courses: string
  skills_teach: string
  skills_learn: string
  interests: string
  mode: 'in_person' | 'online' | 'either'
  energy: 'low' | 'medium' | 'high'
}
export type ApiSkillMatch = { user: ApiAccount; they_teach_me: string[]; i_teach_them: string[]; mutual: boolean }
