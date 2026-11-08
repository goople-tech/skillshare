# Product and backend priorities

This is the implementation reference for the next backend/product changes. Keep its order current as work completes. Leave unrelated landing-page changes to their owner.

## 1. Make shared data safe and durable

- Restrict skill-match responses to the public matching fields rather than another student's email, stored photo, or complete private profile.
- Aggregate campus presence into broad cells before returning heat data; individual coordinates must only be returned to their owner through `/presence/me`.
- Infrastructure owner: explicitly configure and verify the production PostgreSQL/TigerData `DATABASE_URL`, record-only durability/restart check, backup path, and fail-closed production database policy. Do not put credentials in Git or report a local SQLite test as production persistence proof.
- Code status: public profile/presence boundary and focused regression coverage implemented locally (all 11 backend tests passing); no production credentials or infrastructure changes claimed. Production clients need the coordinated backend deployment before the coarse-area API can respond successfully. Production PostgreSQL/TigerData confirmation and durable restart/backup verification remain with the infrastructure owner.

## 2. Implement dependable database search and filtering

- Add bounded, case-insensitive listing search across title, description, tag and location.
- Filter listings by category, online/in-person/either preference, teachable skill, desired skill, course/interest, and whether space remains.
- Implement SQL-side escaping and sorting, validated parameters, documented behavior and focused tests; do not pull entire tables into Python for routine filtering.
- Expose the new contract through the existing frontend data source without fabricating recommendations, requests, messages or activity.
- Code status: backend filtering and focused tests implemented locally. Matching over commas and normalized meeting details remain database-design follow-ups for predictable real use; UI discovery controls are not yet wired.

## 3. Complete the core connection workflows

- Add Buddies recommendation and request flows based on shared course/interest, preference and energy, not arbitrary compatibility percentages.
- Add exchange/project invitations, explicit accept/decline ownership rules, scheduled sessions and activity history.
- Keep client mutations unavailable until tests prove real server acknowledgement.

## 4. Harden ownership and API reliability

- Correct the email-domain boundary separately when the auth owner resumes it; never weaken verification.
- Add listing ownership/membership/concurrency safeguards and full listing tests.
- Introduce Alembic migrations and PostgreSQL integration tests; bound input text and AI requests, protect secrets and add rate limits/abuse controls.

## 5. Finish supporting community functionality

- Ratings after completed exchanges, useful notifications/read states, project collaboration workflows, production backups/monitoring, observability, and privacy eligibility review.
- Continue using explicit pending/empty states rather than sample data presented as live.

## Deployment coordination

- The FastAPI service is separate from DeepSpace. On the production Vultr host, use a known clean checkout of `main`, with the existing real database credentials left unchanged.
- Activate an intentional Python virtual environment before installing. From the backend directory run `python -m pip install -r requirements.txt pytest` and `python -m pytest tests -q` (11 expected), then restart the existing FastAPI process through its supervisor and verify the public OpenAPI `areas`/`active_students` heatmap schema before releasing DeepSpace.
- Do not use the old nine-test run as proof of this release, change TigerData allowlists speculatively, put secrets in Git, or delete production records. There are no destructive schema changes in this patch.
- SkillShare discovery/one-lesson ratings are implemented and locally contract-tested, not deployed. Before production: migrate the new tables with Alembic, run the full backend suite, validate real Auth0 tokens and database queries on PostgreSQL, and coordinate with the messaging owner (post-connect `/skillshare/messages`/`/buddies/messages` remains their scope).
- Local integrated checks: 40 backend tests, 9 dashboard/discovery browser checks, 3 messaging browser checks, 31 default frontend unit tests, and separate discovery/messaging/landing runners. Real Auth0 verification, production CORS, PostgreSQL migration/durability and visual QA remain explicit blockers for live acceptance. Match links now resolve partner-and-kind to the real conversation ID, routing into the shared mailbox only after server proof.
- Product/privacy owner: decide whether structured, consented public degree/program and age fields are necessary and appropriate before adding those filters. They are absent deliberately; no year or overall compatibility score should be inferred.
