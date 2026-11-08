# FastAPI database migration boundary

The infrastructure owner must back up and migrate the configured **PostgreSQL**
database before restarting FastAPI with these routes:

```sh
cd backend
# Use the existing, secret runtime environment; do not put its URL in this file.
alembic upgrade head
```

`alembic.ini` holds no URL; `migrations/env.py` reads the runtime `DATABASE_URL`.
The migration creates only `conversations`, `messages`, their FKs, checks and
indexes. It does not add ratings/exchanges, modify swipes, seed messages, or
remove data. Apply it once in staging first, run the backend suite, and retain
the backup. Do not run a downgrade against a live mailbox: it intentionally
removes history and is not an authorized production action.

This checkout has not been migrated, restarted, or deployed by the messaging
implementation. Production database configuration and Vultr restart remain with
the infrastructure owner. Later schema work should use Alembic rather than
expanding the starter's `create_all`/`_add_missing_profile_columns` compatibility.
