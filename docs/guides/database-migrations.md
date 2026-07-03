# Database & Migrations Guide

**This is the highest-risk area of the codebase.** The database is a Supabase
Postgres instance shared with Supabase Auth. A mistake here can silently orphan
new signups (no `public.users` row) or disable Row-Level Security (cross-tenant
data leak). Read this fully before changing any entity, and run the fresh-DB
gate (§5) before you push a schema change.

See also: [Backend guide](./backend.md) · [Operations](../OPERATIONS.md) · [Architecture](../ARCHITECTURE.md)

---

## 1. The three schema sources

The live schema is the sum of **three** things, not just TypeORM. All three
must be applied for the app to work correctly.

**1. TypeORM entities — the source of truth for tables.**
Every `*.entity.ts` under `backend/src/` maps a `public.*` table. Entities
define the columns; migrations are the *applied* record of them. When entities
and the DB disagree, entities win — you generate a migration to reconcile.

> In production `synchronize` is **off** (`app.module.ts`:
> `synchronize: !isProduction`, and prod deploys never auto-run migrations —
> `migrationsRun: false`). The schema only changes when you run the migration
> chain manually. Never rely on `synchronize` against Supabase.

**2. `supabase_setup.sql` (repo root) — the auth mirror trigger. CRITICAL.**
Supabase writes new signups to `auth.users` (a schema TypeORM does *not*
manage). This file installs the `handle_new_user()` trigger + the
`on_auth_user_created` / `on_auth_user_updated` triggers that copy every
`auth.users` row into `public.users` (deriving username/name/provider/google_id
from the auth metadata), plus a backfill for pre-existing users.

**If this file is not applied, every new signup succeeds in Supabase Auth but
gets no `public.users` row — the user exists but the app can't see them.** It is
`SECURITY DEFINER`, so it runs as its owner and bypasses RLS.

> **You MUST re-apply `supabase_setup.sql` (Supabase Dashboard → SQL Editor)
> on any Supabase (re)link or fresh project provision.** Triggers live in the
> database, not in the migration chain — a new/relinked project has none until
> you run this file.

**3. The migration chain — `backend/src/migrations/*.ts`.**
The ordered (timestamp-prefixed) list of DDL that builds `public.*` from empty
to current, ending with the RLS enablement (§6). This is what
`npm run migration:run` applies.

---

## 2. Creating & running migrations

Config: `backend/typeorm.config.ts` builds the `DataSource` from `backend/.env`.
It prefers `DATABASE_URL` if set (CI/Render), otherwise uses discrete `PG*`
vars — the latter avoids the URL-parser mangling the Supabase password/username
("URL-decode trap").

```bash
cd backend

# 1. Change an entity (add a column, a table, an index).
# 2. Generate a migration by diffing entities against the connected DB:
npm run migration:generate
#    (writes src/migrations/<timestamp>-InitialSchema.ts — rename it to
#     something descriptive, e.g. 1780301600000-AddPondFooColumn.ts)

# 3. Review the generated SQL by hand. Generated migrations can include
#    surprising drops/renames — never push one unread.

# 4. Apply the chain to the target database:
npm run migration:run
```

Both scripts run against `-d ./typeorm.config.ts`, so **whichever connection
`backend/.env` points at is where the migration lands.** That choice is the
single most important decision here — see §3.

---

## 3. ⚠️ CRITICAL: run migrations against the DIRECT connection, NOT the pooler

Supabase exposes two connection paths:

| | Host | Port | Use for |
|---|---|---|---|
| **Direct / Session** | `db.<ref>.supabase.co` | `5432` | **migrations, DDL, RLS** |
| **Transaction pooler** | `aws-0-<region>.pooler.supabase.com` | `6543` | app runtime on Render |

**Migrations MUST run against the DIRECT connection.** The transaction pooler
(PgBouncer in transaction mode) cannot reliably hold the session-level locks and
DDL a migration needs — statements get multiplexed across backends and
lock/`ALTER`/`CREATE EXTENSION` behaviour breaks. On the current project the
pooler isn't even served in `ap-south-1`, so it's not an option regardless.

`backend/.env` is set up for exactly this: it holds the discrete **direct**
`PG*` credentials (`PGHOST=db.<ref>.supabase.co`, `PGPORT=5432`, raw password,
**no** `DATABASE_URL`) and is gitignored. Run migrations from your laptop with
that `.env` in place.

> The runtime story is the opposite (documented in `.env.example`): **on Render**
> the app uses the **pooler** URL, because Render has no IPv6 egress and the
> direct `db.<ref>` host hangs there. Direct = migrations (from a laptop);
> pooler = running app. Don't cross the wires.

---

## 4. Roles & RLS: why the backend bypasses it

- **RLS is ON for every `public` table** (migration
  `1780301300000-EnableRowLevelSecurity.ts` loops over all tables and
  `ENABLE ROW LEVEL SECURITY`). There are **no permissive policies** — so the
  Supabase `anon`/`authenticated` roles (which reach the DB only via PostgREST)
  get **zero** table access. The shipped anon key is used for **auth only**;
  all data flows through the NestJS API.
- **The backend connects as the table OWNER** (the `postgres` role via the
  connection string), which **bypasses RLS**. That's why the API can read/write
  every farm while a direct PostgREST call with the anon key can't read a single
  row. This is the SEC-1 guarantee at the database layer.
- The auth trigger `handle_new_user()` is `SECURITY DEFINER`, so it bypasses
  RLS too when mirroring `auth.users → public.users`.

> **Any NEW table you add must enable RLS itself.** The bulk migration ran once,
> over the tables that existed then; a later `CREATE TABLE` is *not*
> retroactively covered. Add to your migration's `up()`:
> ```sql
> ALTER TABLE public.<your_table> ENABLE ROW LEVEL SECURITY;
> ```
> The fresh-DB gate (§5) and the startup guard (§7) will catch you if you forget.

---

## 5. The fresh-DB safety gate — `npm run verify:fresh-db`

**Run this after any schema-touching change, before pushing.**
`scripts/verify-fresh-db.sh` (needs only Docker — no local Postgres) proves a
brand-new Supabase project can be provisioned as a non-event. It:

1. Spins a throwaway `postgres:15` container and creates the `pgcrypto` extension (Supabase parity).
2. Runs the **full TypeORM migration chain** against the empty DB.
3. Asserts the schema materialised — ≥ 33 public tables and the disease library seeded.
4. Stubs a minimal `auth.users` table, then applies **`supabase_setup.sql`** exactly as Supabase would.
5. Inserts a row into `auth.users` and **proves the trigger mirrored it into `public.users`** (this is the exact failure that broke prior relinks — orphaned auth users).
6. Creates a non-owner role with a `SELECT` grant and **proves RLS denies it** — the owner sees the seeded `disease_library` rows, the non-owner sees **zero** (SEC-1 at the DB).

```bash
cd backend
npm run verify:fresh-db
# PASS: full migration chain + auth trigger apply cleanly to an empty database...
```

If this fails, the fresh-Supabase cutover is unsafe — fix before merging. If you
added a table, expect the table-count and (if RLS wasn't enabled) the SEC-1
assertion to catch omissions.

---

## 6. The migration chain (ordering)

Migrations are timestamp-prefixed and applied in order. Landmarks:

- `1700000000000-BaselineSchema.ts` — the baseline: users, farms, ponds, crops, water-quality, etc.
- `1746000000000-SeedDiseaseLibrary.ts` — seeds `disease_library` (the gate checks this).
- `17803007000000-CreateFarmMembers.ts` — the membership table behind the capability model.
- **`1780301300000-EnableRowLevelSecurity.ts`** — enables RLS on every table. **Keep this last-ish**; anything creating a new table after it must enable RLS on that table itself.

A new migration's timestamp must be **greater** than every existing one so it
runs after them. `npm run migration:generate` uses `Date.now()`, which is
correct by construction — just don't hand-edit the number backwards.

---

## 7. Startup schema guard

`backend/src/common/schema-guard.ts` (`assertSchemaReady`, called from
`main.ts` on boot) is the last line of defense. It checks the sentinel tables
(`users, farms, farm_members, ponds, crops`) exist and **fails fast with a loud
log** if they don't — so a deploy against an un-migrated DB crashes immediately
instead of throwing "relation does not exist" per request (or, worse, booting
"healthy" with RLS silently off). It does **not** apply migrations; it only
verifies the result. If you see its FATAL banner, run
`npm run migration:run` against `DATABASE_URL` and redeploy.

---

## Checklist for a schema change

1. Edit the entity (snake_case column names, index FKs).
2. `npm run migration:generate`, then **read** the generated SQL and rename the file descriptively.
3. If you added a table, add `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;` to the migration.
4. `npm run verify:fresh-db` — must PASS.
5. Apply to Supabase with `backend/.env` pointing at the **DIRECT** connection: `npm run migration:run`.
6. On any Supabase (re)link: re-apply `supabase_setup.sql` in the SQL Editor.
7. Deploy; the startup schema guard confirms the result.
