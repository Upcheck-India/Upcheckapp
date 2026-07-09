# Contributing to Upcheck

This guide is how we work in this repo. If you're new, start with [docs/ONBOARDING.md](./docs/ONBOARDING.md) to get running, then come back here.

## TL;DR

- Branch off `master`; never commit straight to `master`.
- Keep the change small and focused; write/adjust tests.
- Backend: `npm test` + `tsc` must pass. Frontend: `tsc` + tests must pass.
- Touched the DB schema? Run `npm run verify:fresh-db`.
- Open a PR using the template; get one review; squash-merge.

---

## 1. Branching & commits

- Base all work on the latest `master`.
- Branch names: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- **Conventional commits** — the history uses them: `feat(auth): ...`, `fix(build): ...`, `chore(db): ...`, `docs: ...`. Keep the subject imperative and under ~72 chars; put the "why" in the body.
- One logical change per commit where practical.

## 2. Before you push — the local gates

**Backend** (`cd backend`):
```bash
npx tsc -p tsconfig.json --noEmit    # typecheck (must be clean)
npm test                             # jest (must be green)
npm run lint                         # eslint --fix
```
**Frontend** (`cd frontend`):
```bash
npx tsc -p tsconfig.json --noEmit    # typecheck (must be clean)
npx jest                             # tests
```
**Schema change?** From `backend/`: `npm run verify:fresh-db` (see [database guide](./docs/guides/database-migrations.md)) — this must pass before the migration is considered safe.

**Touched docs?** From the repo root: `node scripts/check-doc-links.mjs` — verifies every relative cross-link resolves. CI runs this on every PR (the **Docs** workflow), and also posts a non-blocking reminder if you change app code without touching docs.

**CI:** the **CI** workflow (`.github/workflows/ci.yml`) runs on every PR — backend build + `npm test`, frontend `tsc --noEmit` + `jest`. It doesn't yet enforce lint (backend lint has known debt; see [LAUNCH_REMEDIATION](./LAUNCH_REMEDIATION.md)).

**Non-trivial behavior change?** Actually exercise it (boot the API / drive the screen), don't rely on tests alone.

## 3. Testing expectations

- Backend uses **Jest** (`backend/**/*.spec.ts`), including unit + a few property/integration specs (notably auth). Add or update specs for the code you change.
- When you fix a bug, add the regression test that would have caught it.
- Security-sensitive code (auth, farm-scoping, money) always gets a test asserting the *secure* behavior.

## 4. Code style & conventions

- **Backend:** the module/controller/service/entity/dto convention — see [backend guide](./docs/guides/backend.md). New endpoints go through the auth guard by default; mark public routes `@Public()` deliberately. Validate input with a class-validator DTO. Scope every list/read to the caller's farms via `FarmAccessService`.
- **Frontend:** functional components + hooks; **zustand** for state; **no emojis in UI** — icons come from `MaterialCommunityIcons` only (see the design system in `docs/reference/UPCHECK_DESIGN_SYSTEM.md`). User-facing strings go through **i18n** (`t('ns.key')`) in **all 6 languages** — see the [i18n guide](./docs/guides/i18n.md).
- Match the surrounding code's style; don't reformat unrelated lines.

## 5. Security checklist (for any new endpoint)

- [ ] Behind the auth guard? (`@Public()` only when intentional and safe)
- [ ] Input validated with a DTO?
- [ ] Data scoped to the caller's accessible farms (no IDOR)?
- [ ] Financial data gated with `VIEW_FINANCIALS`?
- [ ] New table? RLS enabled on it?

See [auth & security](./docs/guides/auth-security.md) for the full model.

## 6. Pull requests

- Fill in the PR template (what/why, how tested, screenshots for UI).
- Green CI/local gates + one approving review.
- Keep PRs reviewable (< ~400 lines of real change where possible).
- **Deploying is separate from merging** — see [OPERATIONS](./docs/OPERATIONS.md). Backend → Render; frontend → EAS. Don't assume a merge ships anything.

## 7. What NOT to commit

- `backend/.env`, service-role keys, DB passwords (all gitignored — keep it that way).
- Large binaries (the 2.3 MB design `.docx` is intentionally gitignored).
- Generated output (`dist/`, build artifacts).
