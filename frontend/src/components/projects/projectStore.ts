/** Project drafts are kept in this browser only (no server table yet). All storage access is guarded. */
export type Project = { id: string; title: string; pitch: string; skills: string[]; createdAt: number }

export const STORAGE_KEY = 'ubcver.projects.v1'
export const MAX_SKILLS = 6
export const MAX_PROJECTS = 20

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

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return typeof p.id === 'string' && typeof p.title === 'string' && typeof p.pitch === 'string'
    && Array.isArray(p.skills) && p.skills.every((s) => typeof s === 'string') && typeof p.createdAt === 'number'
}

export function loadProjects(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Project[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isProject).slice(0, MAX_PROJECTS) : []
  } catch { return [] }
}

export function saveProjects(projects: Project[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): boolean {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(projects.slice(0, MAX_PROJECTS))); return Boolean(storage) } catch { return false }
}

export function newProject(title: string, pitch: string, skillsText: string, now = Date.now()): Project {
  return { id: `p${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: title.trim().slice(0, 80), pitch: pitch.trim().slice(0, 280), skills: parseSkills(skillsText), createdAt: now }
}

export function teammatesQuery(skills: string[]): string {
  const params = new URLSearchParams()
  for (const skill of skills.slice(0, MAX_SKILLS)) params.append('skills', skill)
  params.set('limit', '6')
  return params.toString()
}

function safeStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage } catch { return undefined }
}
