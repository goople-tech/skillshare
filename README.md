# Flockwork

A student-community hackathon project built for HackCamp 2026. Flockwork connects people through study buddies, skill exchanges, and project collaboration.

**Public site:** [flockwork.app.space](https://flockwork.app.space/)

Flockwork is an independent student project and is not affiliated with the University of British Columbia.

## Current implementation

The repository includes both a public landing page and application routes connected to a FastAPI backend. It is no longer only a landing-page prototype.

| Area | Implementation in this repository |
| --- | --- |
| Public landing page | React/TypeScript introduction with illustrative buddy cards, skill exchanges, and a campus map. These previews are not evidence of live users or activity. |
| Sign-in | The landing button routes signed-out visitors to `/auth` and signed-in visitors to `/home`. The `/auth` route loads public runtime configuration and starts Auth0 email-code sign-in. |
| Profiles | Profile creation/editing, courses, interests, skills, meeting preferences, and energy preferences. |
| Buddies and SkillShare | Compatibility-ranked swipe decks, mutual-like matching, skill discovery, and matched-user conversations. |
| Projects | Persistent project creation, browsing, owner-restricted deletion, and teammate discovery by required skill. |
| Campus | A separate signed-in campus activity page backed by presence/heatmap code; demo limitations are described below. |

The legacy `frontend/src/App.jsx` is still used by `/account`; it is not merely an unconnected reference. Product pages also use the shared FastAPI request helper in `frontend/src/api.js`.

### Public deployment observation

On November 9, 2026, the public landing page loaded and its **Log In / Sign Up** button navigated through `/auth` to the Auth0-hosted email sign-in screen. This observation did not include submitting an email, signing in, or testing authenticated workflows against production. Source implementation and local tests should not be presented as proof that every deployed workflow is operational.

## Architecture

- **Frontend:** React 19, TypeScript, Vite, and the DeepSpace `0.43.0` scaffold; routed product pages live under `frontend/src/pages/`.
- **Public configuration:** `frontend/src/client-runtime.tsx` requests `/api/client-config`, configures the FastAPI base URL, and supplies Auth0 configuration. The route returns public SPA configuration, not provider secrets.
- **API:** Python/FastAPI with SQLAlchemy models and Alembic migrations. SQLite is the local default; `DATABASE_URL` supports PostgreSQL. The production database engine is not established by this README.
- **Identity:** Auth0 passwordless email sign-in with bearer tokens sent to FastAPI.
- **Optional AI features:** Gemini-assisted listing and matching tools in the backend. Credentials stay server-side.

The registered app identity is already present in `frontend/wrangler.toml`; `frontend/src/constants.ts` receives it from the build. Do not replace it with a made-up ID or initialize a second app to run a build. The local preview's placeholder identity is separate and is never a production identity.

## Authentication, authorization, and eligibility

`backend/app/auth.py` verifies RS256 JWT signatures using Auth0 JWKS and configures issuer and audience validation. It retrieves a verified email from Auth0 and applies the permitted email suffix list before resolving the application profile.

The current list includes `student.ubc.ca`, `students.cs.ubc.ca`, `alum.ubc.ca`, and `ubc.ca`. **A verified address on this list does not prove current student enrollment.** Describe this as verified-email eligibility, not a guarantee that every account belongs to a current student.

Authentication and resource authorization are separate. For example, project deletion checks the authenticated caller against the project owner. Matching responses intentionally omit private fields such as email, and conversation access has its own participant and matching checks. These controls do not constitute a comprehensive security audit.

Backend tests commonly override the verified-email dependency for isolated behavior tests. They exercise application rules without proving the live Auth0 tenant, email delivery, callback configuration, or production token-validation flow.

## Demo data and known limitations

- Landing-page people, exchanges, and the public campus illustration are examples, not measured activity.
- `backend/seed_demo.py` can create synthetic profiles under `@demo.ubcver.invalid`; those are not sign-in accounts.
- Current `backend/app/skillshare.py` deliberately includes demo profiles and ratings in discovery. Scheduling an exchange with a demo profile is rejected.
- Presence/heatmap code in `backend/app/main.py` contains demo behavior retaining older presence points. Do not interpret a populated map as a count of currently active real students without checking those settings.
- Public documentation and code comments written during the original landing-only phase may still describe a prototype dialog or an unregistered app. For current wiring, inspect `frontend/src/pages/index.tsx`, `frontend/src/pages/auth.tsx`, `frontend/src/client-runtime.tsx`, `frontend/src/api.js`, and `frontend/wrangler.toml`.
- Registration settings, database migrations, rate limits, retention policy, and production end-to-end verification remain separate operational concerns. No deployment or runtime settings are changed by this documentation update.

## Development and checks

Use Node `22.15+` in the supported 22.x, 24.x, or 26.x series and npm `11.6+`, as specified in `frontend/package.json`.

```sh
cd frontend
npm ci
npm run lint
npm run test:frontend
npm run type-check
```

From the repository root, for a local frontend preview:

```sh
npm --prefix frontend run preview:local -- --host 127.0.0.1 --port 5174 --strictPort
```

`vite.preview.config.ts` is a frontend-only preview configuration. It does not provide the deployed worker's `/api/client-config`, a running FastAPI service, or a complete Auth0 environment. Landing content can be reviewed independently; this command is not an end-to-end authentication test and must not be deployed.

For isolated backend tests, create a disposable virtual environment and run from `backend/`:

```sh
python -m pip install -r requirements.txt pytest
python -m pytest tests
```

The test fixtures use disposable SQLite data and identity overrides. Never point them at a production database. Representative test files include `test_profiles.py`, `test_swipe.py`, `test_projects.py`, and `test_messaging.py`.

For integrated development, coordinate the existing app with its owner. Configure FastAPI's `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, and `DATABASE_URL`, and the frontend worker's `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE` in the appropriate local environment. Keep secrets out of Git. The actual Auth0 callback route is `/auth`, so allowed callback URLs must include the relevant origin followed by `/auth`; do not rely on root-only callback examples in older setup notes.

## Team workflow and deployment

- GitHub `goople-tech/skillshare` is the authoritative repository. Use focused branches and reviewable pull requests.
- Read the applicable `AGENTS.md` before editing a component or backend feature. Preserve existing identity and privacy checks.
- Coordinate schema/API changes with teammates; separate illustrative previews from actual application data.
- DeepSpace documentation: [docs.deep.space](https://docs.deep.space/). Keep the existing registered app and source provider; deployment is a separate, deliberate action.
- Do not commit local credentials, generated databases, dependency directories, or build output.

The commands above describe available checks; this documentation change does not claim that the entire test suite or production acceptance tests were run.
