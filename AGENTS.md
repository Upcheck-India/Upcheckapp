# AGENTS.md — AI Agent Collaboration Guide for Upcheck

This repository is worked on concurrently by multiple people, each possibly
paired with an AI coding agent (Claude Code, Cursor, Copilot, or other
tools). This document is the shared protocol every agent — regardless of
vendor — must follow so we don't overwrite each other's work, ship a broken
`master`, or repeat bugs this project has already been burned by once.

If you are an AI agent reading this at the start of a session on this repo:
read this file fully before touching any code, and follow it exactly.

## Repo

- Canonical remote: `https://github.com/Upcheck-India/Upcheckapp.git`
  (the repo moved from `Kiransekar/Upcheckapp` — if your local `origin`
  still points at the old URL, fix it first:
  `git remote set-url origin https://github.com/Upcheck-India/Upcheckapp.git`)
- Default branch: `master`
- Layout: `frontend/` (Expo / React Native app), `backend/` (NestJS +
  TypeORM + Postgres via Supabase, hosted on Render)

## Before starting ANY session

1. `git fetch origin && git status` — never assume your local tree is
   current. Teammates and their agents push independently.
2. Check open work before picking a task:
   - `gh issue list` and `gh pr list` if `gh` is installed and authenticated.
   - If `gh` isn't set up, ask the human to check the GitHub web UI, or
     help them run `gh auth login` first.
3. Ask the human directly: *"What am I working on, and is anyone else
   already touching this area?"* Don't assume — a teammate's agent may have
   unpushed local work you can't see from git alone.
4. If the task isn't already tracked, create a GitHub issue for it
   (`gh issue create`) or ask the human to file one, before writing code.
   This is how the team avoids duplicate effort across multiple agents.

## Branching & commits

- **Never commit directly to `master`.** Every fix/feature/chore gets its
  own branch cut from an up-to-date `master`:
  ```
  git checkout master && git pull && git checkout -b fix/<short-description>
  ```
  (`feat/...`, `chore/...`, `fix/...` prefixes as appropriate.)
- Small, focused commits — one logical change per commit. Stage files by
  explicit name after reviewing `git status`; never `git add -A` / `git add .`.
- Never force-push, never rewrite history that's already been pushed, never
  skip hooks (`--no-verify`), never run `git reset --hard` / `git clean -f`
  without first checking `git status` and stashing anything unexpected.

## Before every commit (mandatory, no exceptions)

- Backend touched: `cd backend && npx tsc --noEmit -p . && npx jest --silent --maxWorkers=2`
- Frontend touched: `cd frontend && npx tsc --noEmit && npx jest --silent --maxWorkers=2`
- Run both if both sides changed. All tests must be green and typecheck
  clean before you commit — don't weaken or delete a failing test to make
  it pass without first understanding why it failed.

## Opening a PR

- Push your branch: `git push -u origin <branch-name>`
- Open a PR against `master`, ideally with `gh pr create`, including:
  - What changed and why (a few bullets — focus on *why*)
  - What you ran to verify it (tests, typecheck, manual check)
  - Anything risky called out explicitly: DB migrations, permission/role
    logic changes, anything touching shared auth or offline-sync code
- **Do not self-merge.** Every PR — from any agent — needs a human on the
  team to review and merge it, even once checks are green. Say so
  explicitly in the PR and wait.
- If master moves before your PR is reviewed, merge/rebase it in, rerun
  the full test+typecheck gate, and don't force through a conflict.

## Codebase-specific landmines (already hit these — don't repeat them)

- **Migrations are not automatic.** TypeORM migrations must be run manually
  in production (`npm run migration:run`). A migration merged to `master`
  but not yet applied means the entity class has columns the live DB
  doesn't have — every caller of that table gets a raw 500, not just your
  new feature. If your PR adds a migration, say so loudly and assume it is
  **not yet applied** in prod until a human confirms otherwise.
- **Fail-safe pattern for not-yet-migrated schema:** see `isMissingTable()`
  helpers in `FarmAccessService`, `TwoFactorService`, `DiseaseService`.
  Check Postgres error codes `42P01` (undefined_table) / `42703`
  (undefined_column) and degrade gracefully (empty result / default /
  logged warning) instead of throwing — one unmigrated column should never
  500 an entire endpoint.
- **Scope every `User` query.** Never use a bare `usersRepo.findOne()` or
  `relations: ['user']` — always pass a scoped `select` (see
  `PUBLIC_USER_SELECT` in `backend/src/farm-members/farm-members.service.ts`)
  so reads don't depend on columns that might not be migrated yet.
- **Offline-first is mandatory for loggable data.** Use
  `frontend/src/sync/recordSync.ts`'s `saveRecord()` pattern (client-mints a
  UUID, queues on failure/offline, idempotent replay keyed on `dto.id` on
  the backend). Any new loggable entity needs this from the start.
- **React Navigation keeps screens mounted.** Any screen showing data that
  can change elsewhere must refetch in `useFocusEffect`, not just on mount.
- **i18n covers 6 locales** (en/hi/ta/te/bn/or) under
  `frontend/src/i18n/locales/<lang>/`. A new namespace file must be
  imported *and* registered in every locale's `index.ts`, or the whole
  namespace silently resolves to nothing. Adding a key to `en` only and
  forgetting the other 5 is the single easiest mistake to make here —
  check all 6 before calling an i18n change done.
- **Permissions are mirrored on both sides.** Frontend:
  `usePermissions` / `membershipStore` / `permissions/capabilities.ts`.
  Backend: `FarmAccessService` / `farm-access/farm-capability.ts`. Changing
  one without the other creates a client/server mismatch.

## Deploys — reserved actions, human-gated every time

- **No agent publishes a cloud/OTA update** (`eas update`, app store
  submissions, or the equivalent for whatever stack). This stays a
  deliberately human-triggered action even when everything is green.
  Treat any single approval to do this as scoped to that one instance —
  never a standing permission for future sessions.
- **Local builds/build-checks are opt-in per person, and must be asked
  about first.** Building the mobile app locally needs specific tooling
  (Android SDK / Xcode, sufficient RAM/disk) that may not exist on a given
  machine. Before attempting a local build or dev-server run to verify a
  change:
  1. Ask the human first — never assume the toolchain or resources exist.
  2. Confirm what's actually available (`npx expo-doctor`, `adb devices`,
     Xcode version, free RAM) before attempting anything heavy.
  3. If declined or the tooling isn't there, fall back to `tsc --noEmit` +
     the test suite as your verification, and say so plainly — don't claim
     the UI was verified when it wasn't.

## When you're not sure

Stop and ask the human rather than guessing — especially for: merge
conflicts, ambiguous ownership of a file/area, anything destructive
(`reset --hard`, force-push, dropping data), or any tradeoff between
correctness and speed. Pausing costs a minute; a wrong guess in this
codebase has repeatedly cost hours (see the migration landmine above).
