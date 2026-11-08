/** All Projects I/O lives here. Backend: app/projects.py. */
import type { ApiPublicProfile, Request } from '../swipe/swipeSource'

export const MAX_SKILLS = 6

export type Project = { id: number; title: string; pitch: string; skills_needed: string[]; owner: ApiPublicProfile; is_mine: boolean; created_at: string }
export type ProjectInput = { title: string; pitch: string; skills_needed: string[] }
export type SkillGroup = { skill: string; students: ApiPublicProfile[] }

/** Split a comma list into trimmed, de-duplicated (case/space-insensitive) skills, capped at MAX_SKILLS. */
export function parseSkills(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(',')) {
    const skill = raw.trim().slice(0, 100)
    const key = skill.toLowerCase().replace(/\s+/g, '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(skill)
    if (out.length === MAX_SKILLS) break
  }
  return out
}

/** GET /projects, POST /projects, DELETE /projects/{id}, GET /projects/{id}/teammates, plus SkillShare like/matches. */
export class ApiProjectSource {
  constructor(private readonly request: Request) {}
  list() { return this.request<Project[]>('/projects') }
  create(input: ProjectInput) { return this.request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }) }
  async remove(id: number) { await this.request(`/projects/${id}`, { method: 'DELETE' }) }
  teammates(id: number) { return this.request<SkillGroup[]>(`/projects/${id}/teammates?limit=6`) }
  matches() { return this.request<Array<{ profile: ApiPublicProfile }>>('/swipe/matches?kind=skill') }
  like(targetId: number) { return this.request<{ matched: boolean }>('/swipe', { method: 'POST', body: JSON.stringify({ target_id: targetId, kind: 'skill', direction: 'like' }) }) }
}
