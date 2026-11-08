# Projects (`/projects`) and Campus (`/campus`)

- `/projects` (`pages/(app)/projects/index.tsx` → `ProjectsView.tsx`): a student describes a project and the skills it needs; for each skill we call `GET /projects/teammates?skills=…` (backend `app/projects.py`) and list students whose public `skills_teach` contains that skill.
- Project drafts live in this browser only (`projectStore.ts`, key `ubcver.projects.v1`). No server table or migration yet — say so in UI copy; never imply projects are published.
- "Ask to team up" records a SkillShare like (`POST /swipe`, kind `skill`). Messaging stays mutual-match only: the Message button appears only for existing SkillShare matches.
- Only `StudentMatchOut` public fields are shown. No scores.
- `/campus` (`pages/(app)/campus/index.tsx`) renders `LiveHeatmap` full size; styles are in `projects.css` (`.campus-page`).
- Tests: `npx vitest run src/components/projects`; backend `python -m pytest tests/test_projects.py`.
