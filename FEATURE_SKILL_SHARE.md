# SkillShare discovery handoff (local feature branch)

## Scope

`/skillshare` reuses the Auth0 session/client runtime, established dashboard header, and the shared swipe source/deck. Public landing `/`, `/home`, Auth0 verification and messaging ownership are preserved. The other agent's messaging and migration files are not part of this feature summary.

Implemented locally on branch `skillshare-discovery`, not committed/pushed/deployed.

## Files changed by this feature

- `.gitignore`: ignore local screenshot artifacts.
- `backend/app/main.py`, `models.py`, `schemas.py`, new `app/skillshare.py`; `backend/tests/test_skillshare_discovery.py`; `backend/migrations/versions/20261108_02_completed_lesson_ratings.py`.
- `backend/AGENTS.md` and `TODO.md`: API/persistence contract and missing-field/deployment follow-ups.
- `frontend/src/pages/(app)/_layout.tsx`, `frontend/src/components/dashboard/AppNavigation.tsx`, shared `components/swipe/SwipeLauncher.tsx`, `CrossedCards.tsx`, `AGENTS.md` route/dismissal props; `tests/dashboard-playwright.config.ts` includes the new spec.
- New `(app)/skillshare/index.tsx` and `skillshare/_layout.tsx` (Generouted parent; preserves sibling `messages.tsx`), typed `components/skillshare/*` source/UI/styles/tests, `tests/skillshare-discovery.spec.ts`, `vitest.discovery.config.ts`, frontend `router.ts` generated route list.
- `backend/requirements.txt` has alembic for the separately maintained migration path (coexists with the messaging agent's migration work). Do not remove it.

## Contract and safety

- Discovery is bounded SQL filtering/ranking by actual skill overlap, category vocabulary, meeting preference and completed-review aggregate. Filters use a typed source, not presentation fetches. Catalog data comes from profile skills; no age/degree/year fields or empty behaviorless filter is supplied.
- Public profiles expose only `StudentMatchOut` public fields. Average is `null`, never zero, for unreviewed students. Rating authors, private feedback values, notes, schedule and email are not public aggregates.
- Scheduling requires reciprocal SkillShare likes; lessons have timezone-bearing scheduled timestamps and distinct participants. Both participants must confirm completion after that timestamp. Reviews require both confirmations, are one per person/lesson via constrained PUT update, and prohibit self-rating in both route and schema. The MVP supports one lesson/pair, not bundles.
- Adding the Alembic migration does not run it. A production owner must review/rehearse `alembic upgrade head` using real configured production storage before enabling routes. `create_all` is only development compatibility.

## Verification performed

- `cd backend && /tmp/skillshare-venv/bin/python -m pytest tests/test_skillshare_discovery.py -q`: **8 passed**.
- Focused migration + rating suite: **9 passed** (`test_additive_alembic_migration_creates_constraints_and_indexes` included).
- Legacy tests pass in separate standard invocations: profiles **8**; swipe/search/privacy **10**; messaging/presence/original SkillShare **13**. Clean baseline all together also passed (**25**), so full mixed-suite failures are cross-fixture DB/identity pollution rather than something to hide or blame on Auth0.
- Full `cd backend && python -m pytest tests -q`: **40 passed**, including the updated messaging shared-normalized-ID test and portable additive migration creation. Legacy singleton test databases reset only at their defined module boundaries; focused rating/messaging fixtures keep their own session scopes. Test identities still use test-only dependency overrides; no production auth behavior changed.
- `npx vitest run --config vitest.discovery.config.ts`: **2 passed**.
- Playwright (local approved Brave): all **9** combined dashboard/location/discovery tests pass. Checks cover identity mocks, filters/query serialization, close/restore via keyboard and Escape, native-deck opening/closing, incomplete vs eligible rating, editable ratings, API failure recovery, avatar/caret geometry and no horizontal overflow at **1440, 1260, 1210, 1200, 1101, 1100, 679/680, 390px**.
- `npm run type-check`, `npm run lint`, `npm run build`, legacy `test:frontend`, discovery tests: passed. Wrangler produces a log permission warning but frontend production build finishes successfully.
- `frontend/artifacts/skillshare-{desktop,mobile}.png` saved and gitignored. This session's image viewer could not render them because `/Users/TheRealGoo/.config/telnyx/credentials.env` is missing; no visual-description pass claimed. Geometry assertions passed.

## Remaining owner work

1. Resolved in shared local integration: legacy fixtures isolate original singleton engine data; DOM-dependent React tests run correctly in Happy DOM during the default `npm run test:unit`. New match cards and the mutual-match overlay resolve partner/kind -> actual conversation ID via `/conversations`, and partner-inbox links never interpret participant IDs as mailbox IDs.
2. Backend/infrastructure owner: review/rehearse the additive migration, production durability/backups and PostgreSQL SQL behavior; there has been no real DB deployment/config change.
3. Auth/integration owner: confirm the real Auth0 tenant/token/API service. Verified here via repository-approved mock identity only. Nothing is claimed as a live production service.
4. Product/privacy owner: define explicit consented public degree/program and age policy before adding those filters; they deliberately do not exist now.
5. Product owner: future lesson bundles need their own lesson model/migration. Messaging owner retains `/skillshare/messages`, `/buddies/messages`, their components/tests and base migration.
