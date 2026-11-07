# Backend guidance

## Scope and boundaries

This directory contains the teammate-authored FastAPI, SQLAlchemy, and Gemini backend starter. Landing-page work should preserve it and coordinate backend behavior/API changes with its owner. `frontend/src/api.js` and the preserved `frontend/src/App.jsx` are the original integration reference; they are not yet connected to the DeepSpace landing runtime.

Before extending the service, document expected models/endpoints, error handling, data retention, and authorization rules, and add focused backend tests. Keep generated SQLite databases, `.env`, virtual environments, and caches out of Git. Refer to `AGENTS.md` at the repository root for team and frontend/DeepSpace boundaries.

## Security invariants

- As of latest base `5e85cf4`, Auth0 passwordless email login and backend bearer/JWKS checks enforce a verified UBC email. Use `AUTH0_SETUP.md` for local configuration, preserve `email_verified` and issuer/audience enforcement, and distinguish verified identity from student-role authorization. No credentials or live tenant tests are included in the frontend branch.
- `14a7d7a` validates permitted emails by string suffix. `you@fakeubc.ca` therefore passes `@ubc.ca`; parse the domain after `@` and compare it to the team-approved allowlist instead. Also confirm the role/eligibility policy because not every UBC-domain address is necessarily a current student. Coordinate any fix with the backend owner.
- Plan verified identity, session handling, authorization, and ownership rules with the relevant platform/backend contributors. A client-supplied user ID is not authentication or authorization.
- Never expose `GEMINI_API_KEY` in frontend code or commit it. Add rate limits, input/token bounds, model-output validation, and failure handling before production AI use.
- Campus activity must not expose precise individual student locations. Implement aggregation, opt-in consent, retention controls, and access policy before treating activity data as live.

## Local development

Dependencies are in `requirements.txt`; use an isolated virtual environment. Copy `.env.example` to an ignored `.env` and supply only credentials you manage. The frontend preview defaults to its own local-only server at port 5174, whereas the starter API/CORS config currently expects 5173. Keep origins explicit when integrating the two; do not replace safe restrictions with a blanket production CORS rule.
