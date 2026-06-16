# Archived — legacy Supabase SQL (DO NOT USE)

These three files (`schema.sql`, `schema-full.sql`, `schema-additions-only.sql`) were an
early, hand-written attempt at the database schema. They are **dead** and have been
moved out of `frontend/supabase/` to remove schema-source drift.

**The single source of truth for the database schema is the TypeORM migration chain:**
`backend/src/migrations/*.ts`.

The only other schema artifact is `supabase_setup.sql` (repo root) — the
`handle_new_user()` trigger that mirrors `auth.users → public.users`. It is applied
once per Supabase project (scripted in `backend/scripts/verify-fresh-db.sh` and in the
cutover runbook, `UPCHECK_LAUNCH_PLAN.md` §6).

To verify the schema applies cleanly to an empty database:
`cd backend && npm run verify:fresh-db`

Kept only for historical reference. Do not apply these to any database.
