# Upcheck Documentation

The map of everything. New here? Go to **[ONBOARDING](./ONBOARDING.md)** first.

## Start here
- **[Onboarding](./ONBOARDING.md)** — fresh clone → running backend + app.
- **[Architecture](./ARCHITECTURE.md)** — how the system fits together.
- **[Features](./FEATURES.md)** — reference map of every feature → module + screen.
- **[Contributing](../CONTRIBUTING.md)** — branch, test, review, ship.
- **[Operations](./OPERATIONS.md)** — deploy & runbook (backend → Render, frontend → EAS).

## Deep-dive guides
- **[Backend](./guides/backend.md)** — NestJS module pattern, guards, RBAC, testing.
- **[Frontend](./guides/frontend.md)** — Expo/RN structure, navigation, state, offline sync, UI kit.
- **[Auth & Security](./guides/auth-security.md)** — auth flows, 2FA, multi-tenant isolation, the security model.
- **[Database & Migrations](./guides/database-migrations.md)** — schema sources, migration workflow, RLS, the mirror trigger.
- **[i18n](./guides/i18n.md)** — the 6-language localization system.

## Operational references
- **[Play Store launch](./PLAY_STORE_LAUNCH.md)** — store release checklist.
- **[App flow](./APP_FLOW.md)** — screen-by-screen navigation.
- **[Account migration](./ACCOUNT_MIGRATION.md)** · **[Telugu translation TODO](./I18N_TELUGU_TODO.md)**
- **[legal/](./legal/)** — privacy policy, terms, account deletion.

## Reference (historical specs, plans, research — kept for context)
- **[reference/](./reference/)** — the original PRD, launch plan, feature matrix, app-flow/screens, design system, Truecaller & lunar specs, competitor teardowns.
- **[archive/](./archive/)** — superseded/stale docs (old audit, legacy feature list, legacy Supabase SQL).

---

### Doc conventions
- Docs live under `docs/`; the root keeps only `README.md` and `CONTRIBUTING.md`.
- Every claim should be grounded in real code — cite `path/to/file.ts`.
- Keep docs close to the truth: if you change behavior, update the relevant guide in the same PR.
