# Developer Onboarding

Welcome to Upcheck. This gets you from a fresh clone to a running backend + app. Budget ~30–45 minutes. After this, read [ARCHITECTURE](./ARCHITECTURE.md) and the guide for whatever you're touching.

## 0. What Upcheck is

A shrimp-farming operations app for the Indian aquaculture market: farm/pond management, water-quality & feed logging, growth calculations (FCR, ADG, survival, biomass), inventory, finance, alerts, and rule-based decision engines — in 6 languages, offline-tolerant. Monorepo:

```
UPCHECKAPP/
├── backend/     NestJS 11 API · TypeORM · Supabase (Postgres + Auth) · Redis
├── frontend/    Expo SDK 54 / React Native 0.81 app (Android · iOS · web)
├── docs/        ← you are here
└── supabase_setup.sql   auth→public.users mirror trigger (see database guide)
```

## 1. Prerequisites

- **Node.js ≥ 20** and npm
- **Docker** (only for `verify:fresh-db`)
- **Git**
- For the app: a device/emulator + the **Expo** tooling (`npx expo`), and optionally `eas-cli` (`npm i -g eas-cli`) if you'll publish updates
- Access to: the Supabase project, the Render dashboard, and the Expo (`utpl-in/upcheck`) org — ask the owner

## 2. Backend — run it locally

```bash
cd backend
npm install
cp .env.example .env        # then fill in the values (see below)
npm run start:dev           # watch mode
```

**`.env`** needs the Supabase connection + keys. There are two shapes (see `.env.example`):
- Discrete `PG*` vars (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`) — used for **migrations**, and must point at the **direct** host `db.<ref>.supabase.co`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — required to boot (the app throws `Missing Supabase env vars` without all three).
- `DATABASE_URL` — the app's runtime connection (pooler in prod).

On boot the **schema guard** verifies core tables + RLS. Reaching `Backend listening on 0.0.0.0:<port>` means you're up. Health check: `curl localhost:<port>/api/health`.

> Redis is optional — if it's not running you'll see a warning and it falls back to an in-memory store. That's fine for local dev.

## 3. Backend — tests & the DB gate

```bash
npm test                    # jest — should be all green
npx tsc -p tsconfig.json --noEmit   # typecheck
npm run verify:fresh-db     # (needs Docker) proves the full migration chain + auth trigger + RLS on a throwaway DB
```

## 4. Frontend — run the app

```bash
cd frontend
npm install
npm start                   # expo — press a for Android, i for iOS, w for web
```
The app reads its API base from `app.config.ts` (`extra.apiBaseUrl` → `https://api.upcheck.in/api` by default; override with `EXPO_PUBLIC_API_BASE_URL` for local backend). Typecheck: `npx tsc -p tsconfig.json --noEmit`.

## 5. First tour of the code (recommended reading order)

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — how it all fits together.
2. [FEATURES.md](./FEATURES.md) — the map of every feature → where it lives.
3. The guide for your area: [backend](./guides/backend.md) · [frontend](./guides/frontend.md) · [auth & security](./guides/auth-security.md) · [database & migrations](./guides/database-migrations.md) · [i18n](./guides/i18n.md).
4. [../CONTRIBUTING.md](../CONTRIBUTING.md) — how we branch, test, and ship.
5. [OPERATIONS.md](./OPERATIONS.md) — how it deploys (backend → Render, frontend → EAS).

## 6. Make your first change

- Pick a small task, branch `feat/<slug>` off `master`.
- Change code + tests; run the local gates (§3 / CONTRIBUTING §2).
- Open a PR with the template. Remember: **merging ≠ deploying** — see OPERATIONS.

## Gotchas that will bite you (read once)

- **Backend deploys to Render; the app deploys to EAS.** They're separate. A translation or screen change does **not** go live by redeploying the backend.
- **Migrations run against the DIRECT Supabase host, never the pooler**, and never from Render.
- **`supabase_setup.sql` is not in the migration chain** — if the Supabase project is ever relinked and it's not re-applied, new signups silently get no `public.users` row.
- **Supabase "Confirm email" is ON** — `signin` returns `401 "Email not confirmed"` for unconfirmed accounts. Expected.
- **Every user-facing string must exist in all 6 languages** (fallback is English, but don't ship gaps).
