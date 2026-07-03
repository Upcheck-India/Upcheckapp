# Operations Runbook

How Upcheck is deployed, updated, and kept alive in production. Read this before touching anything that ships to users.

> **The one rule that trips everyone up:** the **backend** and the **frontend** deploy through **completely different pipelines**. A backend change goes to **Render**. A frontend change goes to **EAS Update / EAS Build**. Redeploying the backend does *nothing* for a frontend change, and vice-versa.

---

## 1. Production topology

| Surface | Runs on | Live URL | Ships via |
|---|---|---|---|
| Backend (NestJS API) | Render — service `upcheck-backend` | **https://api.upcheck.in** | Render deploy |
| Frontend (Expo app) | User devices (Android/iOS) | — | EAS Update (OTA) / EAS Build (store) |
| Database + Auth | Supabase project `mcslntwchfucavjrrhnu` | `db.mcslntwchfucavjrrhnu.supabase.co` | migrations (manual) |
| Cache | Redis (optional; falls back to in-memory) | — | — |

> **Stale-URL warning:** `upcheckapp-c612.onrender.com` is an **old, separate** Render service. It is NOT production. Production is `api.upcheck.in`. The app's `apiBaseUrl` (frontend/app.config.ts) points at `api.upcheck.in`.

---

## 2. Deploying the backend (Render)

1. Merge to `master` and push.
2. In the Render dashboard, deploy the `upcheck-backend` service (Manual Deploy → deploy latest commit), or rely on auto-deploy if enabled. **Verify it grabs the branch tip**, not an older commit.
3. `render.yaml` `startCommand` runs `npm run start:prod` only — **it does NOT run migrations** (see §4).
4. On boot the app runs the **schema guard** (`backend/src/common/schema-guard.ts`): it asserts the core tables exist AND that RLS is enabled, and fails loudly otherwise. Reaching `Backend listening` means the guard passed.

**Required Render env vars** (set in the dashboard, not in git): `DATABASE_URL` (the **pooler** URL — Render has no IPv6 egress so the direct host hangs), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `FRONTEND_URL`, `PORT`, plus Redis config if used.

### Verify a backend deploy
```bash
curl -s https://api.upcheck.in/api/health          # { status: ok, checks.database.status: up, uptime }
curl -s https://api.upcheck.in/api/health/liveness  # liveness only
```
A **fresh `uptime`** (near 0) confirms the new build swapped in. The Render build log ends with `Your service is live 🎉`.

### Rollback
Render dashboard → the service → **Rollback** to a previous successful deploy.

---

## 3. Deploying the frontend (EAS)

The app uses **EAS Update** (Expo's OTA) — `expo-updates` on SDK 54, project `utpl-in/upcheck`, `runtimeVersion "1.0.0"`, channels `development` / `preview` / `production`.

### JS-only change (translations, screens, logic) → OTA update
No native code changed → push over-the-air; installed apps fetch it on next launch.
```bash
cd frontend
eas update --channel production --message "<what changed>"
```
- Only reaches installed **production-channel** builds on **runtime `1.0.0`**.
- Rollback: `eas update:rollback` (non-destructive).

### Native change (new native dep, SDK bump, native config) → new build
OTA **cannot** cross a native boundary. You must **bump `runtimeVersion`** in `frontend/app.config.ts` and cut a store build:
```bash
cd frontend
eas build --profile production      # produces the AAB/IPA
eas submit --profile production      # or upload to the store manually
```
> Store release also depends on signing/credentials — see `docs/PLAY_STORE_LAUNCH.md`.

---

## 4. Database migrations (HIGH RISK — read fully)

Migrations are **run manually**, never by Render, and **only against the DIRECT Supabase connection**.

### Why the direct connection
The Supabase **transaction pooler cannot reliably do migration DDL/locks**, and this project's pooler isn't even served in `ap-south-1`. `backend/.env` holds the **direct** PG creds (`PGHOST=db.mcslntwchfucavjrrhnu.supabase.co`, user `postgres`). Render uses the pooler at runtime; migrations do not.

### Workflow
```bash
cd backend
npm run verify:fresh-db          # 1. PROVE the whole chain is safe on a throwaway DB (see below)
npm run migration:generate ...   # 2. author a migration (if schema changed)
npm run migration:run            # 3. apply to prod via backend/.env (direct host)
```

### The fresh-DB safety gate — run after ANY schema change
`npm run verify:fresh-db` (`backend/scripts/verify-fresh-db.sh`) spins a throwaway Docker Postgres, runs the **entire migration chain + `supabase_setup.sql`**, proves the `auth.users → public.users` trigger fires, and proves **RLS denies a non-owner** (SEC-1). If it passes, a fresh-Supabase cutover is safe.

### `supabase_setup.sql` — the silent breaker
This root-level file installs the `on_auth_user_created` / `on_auth_user_updated` **trigger** that mirrors `auth.users` into `public.users`. **It is NOT part of the TypeORM chain.** If you ever relink or create a new Supabase project and forget to apply it, **every signup creates an `auth.users` row with no `public.users` row** and the app breaks for that user. Apply it (idempotent) via the direct connection whenever the Supabase project changes.

### RLS
Row-Level Security is **ON for every table** (enabled by a migration). The backend connects with the service-role/owner role, which **bypasses RLS**; the shipped anon key is RLS-locked (SEC-1). **Any new table must enable RLS itself.**

---

## 5. Environment & secrets

- `backend/.env` — **gitignored**; direct PG creds for running migrations locally.
- Render dashboard — runtime backend secrets (see §2).
- Supabase dashboard — DB password, Auth settings.
- `frontend/app.config.ts` `extra` — public config baked into builds (apiBaseUrl, Supabase URL + **anon/publishable** key, Google client IDs). No secrets here.
- Never commit `.env`, service-role keys, or the DB password.

**Auth setting to know:** Supabase **"Confirm email" is ON** in prod — `signin` returns `401 "Email not confirmed"` until the user clicks the emailed link. This is intentional; toggle it in Supabase → Auth → Email if product wants instant-session signup.

---

## 6. Common tasks

| Task | Command / action |
|---|---|
| Check prod backend health | `curl https://api.upcheck.in/api/health` |
| Ship a JS-only app change | `cd frontend && eas update --channel production -m "..."` |
| Roll back an OTA update | `eas update:rollback` |
| Apply a DB migration to prod | `cd backend && npm run migration:run` (uses `.env` direct host) |
| Prove a schema change is safe | `cd backend && npm run verify:fresh-db` |
| Re-install the auth mirror trigger | apply `supabase_setup.sql` via the direct connection |
| Roll back a backend deploy | Render dashboard → Rollback |

See also: [ARCHITECTURE](./ARCHITECTURE.md) · [database & migrations](./guides/database-migrations.md) · [auth & security](./guides/auth-security.md).
