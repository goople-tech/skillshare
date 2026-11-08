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

## SkillShare discovery and lesson ratings

- `GET /skillshare/discover` supports bounded SQL-side `category`, exact normalized CSV `seeking`/`offering`, `meeting`, `minimum_rating` and `limit`. Category choices map declared current-profile terms; `other` is anything outside known mappings. The comma-separated profile representation should be normalized in a later migration before claiming scalable indexing. `/skillshare/catalog` gives a bounded list of real profile skills for UI autocomplete.
- Discovery includes only reciprocal-skill candidates and retains unreviewed people with `average: null`, `completed_reviews: 0`. A numeric minimum intentionally excludes unrated records. Aggregates validate mutual completion and participant relations, exclude the caller's own feedback and contain no author identities/notes. Public profiles remain restricted to `StudentMatchOut`.
- A single lesson per matched pair is the MVP. `POST /skillshare/exchanges` requires reciprocal SkillShare likes and a timezone-bearing timestamp; `PUT .../completion` is restricted to participants after that time and once per person. Both must acknowledge before `PUT .../review` accepts three 1–5 category scores. Re-PUT updates that participant's single lesson rating; no notes or public author IDs exist. `review.values` on the private exchange output restores only the caller's saved ratings for editing.
- `20261108_02_completed_lesson_ratings.py` adds, never rebuilds/drops, the exchange/review tables and constraints. Rehearse through Alembic (`alembic upgrade head`) on an owner-managed target database, alongside the concurrently owned messaging migration. Startup `create_all` remains the development compatibility path, not production migration proof. Multi-lesson bundles need a new lesson identifier/migration; do not reuse this one-row pair MVP.
- Tests use an isolated app/auth dependency and database fixture to avoid module-level suite interference. PostgreSQL integration, real production migration and Auth0/live service checks still require their owners. Public degree/age filters require consented, structured public-profile fields and privacy review; current contracts deliberately omit them.

## Private messaging

- `app/messaging/` owns the two participant tables, Pydantic contracts, and `/conversations` router. `main.py` performs only its router/import registration; do not duplicate models into rating-owned `skillshare.py`.
- Authority for both conversations and message send/read eligibility is a reciprocal `swipes.direction == "like"` pair in the **same** `buddy` or `skill` kind. Listing idempotently materializes eligible mailboxes, but a mailbox alone grants no rights; mutation/read rechecks membership and mutual eligibility. A future accepted Buddies request must explicitly integrate this same read boundary (for example through a neutral bridge adapter after `POST /buddies/requests/{id}/accept`); it does not already exist.
- A scheduled `SkillExchange`, acceptance, or review is **not** messaging authority. Planning may begin on mutual like. If an exchange-aware integration is later required, consume only the owner's `SkillExchange.id` plus its `participant_low_id` / `participant_high_id`; do not duplicate that table or infer messaging from completion/ratings.
- Messages are plain text with outer whitespace trimmed, length 1–2,000. Sender identity, timestamps and integer cursors are server-owned. Read/write responses expose only participant `id`, `name`; no email, photo, private profile, delivered/presence/receipt state. History defaults to 50, is capped at 100, ordered oldest→newest, and paginates through exclusive `before` message ID. Private responses use `Cache-Control: no-store, private`.
- `GET /conversations?kind=…` lists only own valid matches; `GET/POST /conversations/{id}/messages` supports history/send; `POST /conversations/{id}/read` confirms only the caller's current high-water read cursor. There are no editing/deletion/group/attachments/public channels. Bulk query/body bounds are not a complete anti-abuse rate-limiting implementation.
- `alembic upgrade head` applies `20261108_01` (then the concurrent rating revision). Infrastructure owner must back up and rehearse on PostgreSQL, apply with runtime `DATABASE_URL`, run tests, and restart only deliberately. No migration or deployment was run locally beyond isolated SQLite tests. PostgreSQL credentials/runtime are untouched; no local PostgreSQL server was available.
- `tests/test_messaging.py` overrides only `auth.current_email`, uses fresh SQLite files, and tests 4 real profiles, cross-kind/unmatched/foreign authorization, durable history, constraints, cursor windows and independent unread state. Production has no mock identity or message seed.

## Shared verification and matching inbox handoff

- Full `cd backend && pytest tests -q` passes (**40 tests**), including original singleton profile/swipe suites. `tests/conftest.py` assigns a test DATABASE_URL before app imports, resets only that disposable shared legacy engine at each legacy function boundary, and restores auth overrides after each test. Dedicated `get_db` fixtures remain the authority for isolated messaging/discovery/rating files. Do not point these reset helpers at real user data or a production session.
- Migration `20261108_01` creates `conversations` before `messages` then adds cursor FK constraints using `batch_alter_table` for portable SQLite/PostgreSQL execution. Do not recreate foreign keys against a table not yet created without such a batch.
- Mutual API `SwipeSource.resolveConversation(kind, partnerId)` and `?participant=<partnerId>` use `/conversations?kind=...` while authorized to retrieve the actual same-kind mailbox ID. They may materialize an eligible mailbox but never infer ID equality, force navigation after a failed lookup, read foreign history or post a message. Both matched participants get the same normalized numeric conversation; previews never receive private histories.
- The default frontend unit runner includes the messaging component Happy DOM annotation; `vitest.messaging.config.ts` separately covers its dedicated DOM suite. Browser test fixture public API bases must match the actual request (e.g. runtime's localhost:5175 adapter vs local fallback: not localhost:8000 or random substitute) so API responses aren't an HTML fallback interpreted as JSON.
