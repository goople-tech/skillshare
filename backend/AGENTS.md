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

## Profiles

- `User` carries Buddies matching fields: `interests` (comma-separated), `mode` (`in_person` | `online` | `either`) and `energy` (`low` | `medium` | `high`). Allowed values are enforced by `schemas.Mode` / `schemas.Energy`.
- `POST /users` accepts them on creation; `PUT /me` edits the caller's own profile (partial update, only sent fields change). Email comes from the verified token and XP is server-managed, so neither is editable.
- `main._add_missing_profile_columns()` adds these columns to databases created before they existed, because `create_all()` never alters tables. Replace with real migrations (e.g. Alembic) before production.
- Tests: `pip install pytest`, then `python -m pytest tests` from `backend/`. They override `auth.current_email`, so no Auth0 tenant or network is needed.

## Privacy-preserving heatmaps

- Heatmaps return coarse cells (~89m north/south by ~110m east/west) as `areas` plus `active_students`. Only `/presence/me` returns the current user's exact stored coordinates. Never return others' raw rows, even without names: coordinates are personal data. Keep SkillShare matches on `StudentMatchOut` (no email, stored photo, or XP).

## Searching and listings

- `/listings` supports AND-combined `search`, `category`, `skill`, `course`, `interest`, `meeting`, `available`, and `limit` (1..100, default 50). Text filtering runs SQL-side using bounded, escaped case-insensitive substring matching. Meeting choices map to location text during the free-text MVP; `either` includes online/in-person/hybrid. Normalize this field before calling the filters semantic availability or recommendation matching. `available` counts `listing_members`; capacity must be positive.
- Listing tests are required for every filter/ownership change. Add concurrency-safe join checks before claiming capacity enforcement under simultaneous writes.

## Swipe decks

- `app/swipe.py` (router included in `main.py`) owns `GET /swipe/{buddy|skill}/deck`, `POST /swipe` and `GET /swipe/matches`, backed by the `swipes` table (`models.Swipe`, one row per swiper/target/deck; swiping again updates it).
- Decks rank by compatibility only and return `StudentMatchOut` (no email, stored photo, XP or location) plus plain-language `reasons`; ranking points never leave the server. A match is a mutual like in the same deck.
- `seed_demo.py` adds clearly labelled demo students (`@demo.ubcver.invalid`, cannot sign in); `--like-back EMAIL` makes them like that account so a live demo can show a match; `--remove` deletes them. Tests: `tests/test_swipe.py`.

## Messages

- `app/messages.py` (router included in `main.py`): `GET /messages/{user_id}?after_id=` (oldest first, poll with the last seen id) and `POST /messages/{user_id}` (1–1000 chars, trimmed), backed by `models.Message`. Only mutual matches (a like each way in the same deck) may read or send; unknown and unmatched users get the same 403 so accounts can't be probed. Unmatching (changing a like to pass) stops messaging. No realtime push yet; add rate limits before production. Tests: `tests/test_messages.py`.
