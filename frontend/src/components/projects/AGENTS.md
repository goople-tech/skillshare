# Projects (`/projects`) and Campus (`/campus`)

## Projects endpoints (backend `app/projects.py`, table `projects`, migration `20261108_03`)
| Method | Path | Used for |
|---|---|---|
| GET | `/projects` (`?mine=true` optional) | All students' projects, newest first; each has `owner` (public fields) and `is_mine` |
| POST | `/projects` `{title, pitch, skills_needed: string[]}` | "Post project" button (skills trimmed/de-duplicated server-side, max 6; max 20 projects per student) |
| DELETE | `/projects/{id}` | Trash button; owner only, others get 404; returns `{"deleted": true}` |
| GET | `/projects/{id}/teammates` | Right panel: students whose `skills_teach` contains each needed skill, grouped by skill |
| GET | `/projects/teammates?skills=…` | Same lookup for an ad-hoc list |
| POST | `/swipe` (kind `skill`) / GET `/swipe/matches?kind=skill` | "Ask to team up" / "I can help" send a SkillShare like; Message appears only for mutual matches |

- All frontend I/O is in `projectStore.ts` (`ApiProjectSource`); `ProjectsView.tsx` is presentation.
- Only `StudentMatchOut` public fields are shown. No scores.
- Hosted backend: pull, back up, `alembic upgrade head`, restart. (`create_all` also creates the table on startup.)
- `/campus` (`pages/(app)/campus/index.tsx`) renders `LiveHeatmap` full size; styles are in `projects.css` (`.campus-page`).
- Tests: `npx vitest run src/components/projects`; backend `python -m pytest tests/test_projects.py`.
