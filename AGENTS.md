# UBC Ver. project guide

UBC Ver. is a HackCamp 2026 student-community website centered on Buddies, SkillShare, collaborative projects, and privacy-conscious campus activity. It is an independent student project, not a University of British Columbia product.

## Stack and architecture

**Frontend is React** (currently React 19 + TypeScript on the Vite-based DeepSpace scaffold). Preserve React for frontend features; coordinate retained React 18 JSX integration-reference code before migrating it.

DeepSpace `0.43.0` provides the React/Vite scaffold, full-stack primitives, and deployment tooling. `frontend/src/pages/index.tsx` is the static public landing page; the components and design conventions are documented in `frontend/src/components/landing/AGENTS.md`. `backend/` contains the teammates' Python/FastAPI starter; preserve its ownership and coordinate interface changes. Authenticated and synchronized screens belong under `frontend/src/pages/(app)/`, with protected screens under the supplied `(protected)` layout. The original `frontend/src/App.jsx` and `api.js` remain as integration references for the FastAPI/Gemini flow. Do not move routes without reading the routing/authentication documentation.

## Required references

Use https://docs.deep.space/llms.txt and the versioned installed package/API documentation for DeepSpace work. Markdown endpoints are available by appending `.md` to documentation URLs. Prefer the installed package types and CLI `--help` for the pinned version over guesses. If documentation or team decisions do not support a state-safe change, stop and flag it; do not fabricate an app ID, auth flow, live data, or successful verification.

Useful references:
- Quickstart: https://docs.deep.space/get-started/quickstart.md
- Project structure: https://docs.deep.space/get-started/project-structure.md
- Authentication: https://docs.deep.space/guides/authentication.md
- Source control: https://docs.deep.space/guides/source-control.md
- Permissions: https://docs.deep.space/concepts/permissions.md

## Version control and deployment

The authoritative repository is GitHub `goople-tech/skillshare`; it already exists. `main` should remain stable. Create narrow feature branches, focused commits, and reviewable PRs with tests and screenshots where relevant. Coordinate schema, shared config, and runtime changes with the other three contributors. Do not commit credentials, `.dev.vars`, build output, or dependencies.

DeepSpace's source provider can latch permanently on first use. This checkout has an intentional GitHub remote. Do not run `deepspace push`, `app init`, `dev start`, or `deploy` without confirming the intended account, app ownership, available port, and documented source-control behavior. The app's deployment has **not** been authorized or performed by the landing-page work.

`DEEPSPACE_APP_ID = "__APP_ID__"` remains until deliberate registration. DeepSpace requires a server-minted ID for builds, SDK tests, and full-stack development; never hand-write one or bypass production validation.

## Commands

```sh
cd frontend && npm ci                           # reproducible dependency install
npm --prefix frontend run preview:local -- --port 5174 # frontend-only landing preview
npm --prefix frontend run test:frontend        # no-login pure frontend unit tests
npm --prefix frontend run lint                 # all-source ESLint
cd frontend && npx deepspace auth whoami       # inspect, never assume, account
cd frontend && npx deepspace app init          # intentional registration only
cd frontend && npx deepspace dev start         # full-stack dev after registration
cd frontend && npx deepspace deploy            # deliberate release only
```

npm 11.6+ is required by the scaffold. On this machine a compatible npm is available at `/Users/TheRealGoo/.local/bin/npm`; prepend `/Users/TheRealGoo/.local/bin` to `PATH` if the default npm is `10.x`. Port 5173 was already used by a separate legacy `hackcamp-frontend` app; use UBC Ver.'s 5174 preview and leave other teams' processes untouched.

`vite.preview.config.ts` and `vitest.preview.config.ts` are isolated local-only configurations for static/pure frontend work. They contain no valid app identity and are not deployment or data-authorization mechanisms. `vite.config.ts` and DeepSpace's ID checks remain intact for production.

## Product and privacy invariants

- Keep a warm, inclusive student-community tone, not a dating-product tone.
- Use the approved palette and the frontend section's design system.
- Clearly distinguish illustrative examples and previews from real activity or student accounts.
- Never expose precise student locations in the activity preview; aggregation and opt-in safety need backend/team policy before implementation.
- Real university-email/student verification and privileged access must be enforced server-side. The landing dialog is currently only a transparent format-validation prototype.
- Maintain and scope `AGENTS.md` files as areas of the codebase evolve. Capture conventions, boundaries, commands, and unresolved integration responsibilities rather than duplicating implementation.

## Existing backend integration

`main` now includes `backend/` (FastAPI, SQLAlchemy, Gemini) and `frontend/src/App.jsx` / `api.js` for the teammate-authored listing workflow. Those files are not yet connected to the DeepSpace landing page or registered runtime. Preserve them as integration reference rather than silently removing them.

Latest base `5e85cf4` adds Auth0 passwordless email enforcement: the frontend Auth0 provider issues an access token, and the backend uses signature verification and verified-email checks for protected routes. Configure and test locally before treating any integration as production-ready. Never weaken `email_verified`, token issuer/audience, or UBC allowlist checks. Domain validation alone remains only input validation. Keep the preview dialog explicit about this limitation. Any real auth/privilege work must be planned with backend ownership and enforced server-side. Gemini credentials remain in ignored local environment files, never the client bundle or Git.

## Backend email-validation follow-up

At `14a7d7a`, `backend/app/schemas.py` used `endswith` for the accepted domain strings. This admits crafted hosts such as `you@fakeubc.ca`, and `@ubc.ca` includes staff/alumni possibilities beyond the student-only product goal. Continue reviewing the current `backend/app/auth.py` suffix validation for crafted hosts and confirm the eligibility policy separately. The frontend helper uses true parsed-domain matching.

## Dependency authenticity and security

DeepSpace stays pinned to upstream `0.43.0`. Its scaffold still contains example OAuth/auth integrations, while the team intends to replace user authentication with Auth0 under a separate owner. `package.json` temporarily pins/overrides only the transitive `better-auth` resolution to `1.7.18` with its matching adapter family, addressing advisory-affected earlier 1.6 versions; this is a security-compatible substitution, not a new auth implementation or a claim of a verified production auth flow. UI changes do not call Better Auth directly, so the Auth0 owner can replace the unused DeepSpace scaffold auth layers while preserving frontend component contracts. Reassess this override during Auth0 integration or any DeepSpace SDK update; ask an Auth0 specialist instead of adding another frontend auth client.

The public landing page is frontend-only, and no identity, account-verification, deploy, or production data ownership is claimed by frontend checks. Clean-installed lint, TypeScript, and local browser/bundle tests do not replace the registered full-stack auth/integration checks required before deploying those paths.
