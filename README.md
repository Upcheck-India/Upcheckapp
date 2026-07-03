# Upcheck

**Shrimp-farming operations app for the Indian aquaculture market.** Farm & pond management, water-quality and feed logging, growth calculations (FCR, ADG, survival, biomass), inventory, finance, alerts, and rule-based decision engines — offline-tolerant, in 6 languages.

> **New developer?** Start with **[docs/ONBOARDING.md](./docs/ONBOARDING.md)**, then **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

---

## Monorepo layout

```
UPCHECKAPP/
├── backend/     NestJS 11 API · TypeORM · Supabase (Postgres + Auth) · Redis
├── frontend/    Expo SDK 54 / React Native 0.81 app (Android · iOS · web)
├── docs/        all documentation (see docs/README.md)
├── supabase_setup.sql   auth→public.users mirror trigger (not in the migration chain — read the DB guide)
└── CONTRIBUTING.md
```

## Tech stack

| Layer | Tech |
|---|---|
| Backend | NestJS 11, TypeORM, class-validator; Supabase Postgres + Auth; Redis (in-memory fallback) |
| Frontend | Expo SDK 54, React Native 0.81, zustand, i18next (6 languages), expo-updates OTA |
| Auth | Email/password, Google OAuth, Truecaller One-Tap + OTP, email OTP, TOTP 2FA |
| Hosting | Backend → Render (`api.upcheck.in`) · App → EAS Update / EAS Build |

## Quick start

```bash
# Backend
cd backend && npm install && cp .env.example .env   # fill in Supabase creds
npm run start:dev                                    # http://localhost:<port>/api/health

# Frontend
cd frontend && npm install && npm start              # press a / i / w
```
Full setup, prerequisites, and gotchas: **[docs/ONBOARDING.md](./docs/ONBOARDING.md)**.

## Documentation

| Doc | What |
|---|---|
| [Onboarding](./docs/ONBOARDING.md) | Fresh clone → running |
| [Architecture](./docs/ARCHITECTURE.md) | How the system fits together |
| [Features](./docs/FEATURES.md) | Reference map of every feature |
| [Backend guide](./docs/guides/backend.md) | Module pattern, guards, RBAC, testing |
| [Frontend guide](./docs/guides/frontend.md) | Navigation, state, offline sync, UI kit |
| [Auth & Security](./docs/guides/auth-security.md) | Auth flows, 2FA, multi-tenant isolation |
| [Database & Migrations](./docs/guides/database-migrations.md) | Schema, migrations, RLS, mirror trigger |
| [i18n](./docs/guides/i18n.md) | The 6-language localization system |
| [Operations](./docs/OPERATIONS.md) | Deploy & runbook |
| [Contributing](./CONTRIBUTING.md) | How we branch, test, review, ship |

Full index: **[docs/README.md](./docs/README.md)**.

## Deploying (the one thing to remember)

**Backend and frontend ship through different pipelines.** A backend change → **Render**. A frontend change (screens, translations, logic) → **EAS Update** (OTA) or **EAS Build** (store). Redeploying one does nothing for the other. See **[docs/OPERATIONS.md](./docs/OPERATIONS.md)**.

## Status

Pre-launch, actively developed. Backend live at `api.upcheck.in`; app shipped via EAS Update. Play Store release checklist in [docs/PLAY_STORE_LAUNCH.md](./docs/PLAY_STORE_LAUNCH.md).
