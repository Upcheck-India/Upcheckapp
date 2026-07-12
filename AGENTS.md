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

### Commit identity — make it obvious which human this commit came from

Several people are pushing, each possibly paired with an agent — commits
need to be attributable to the actual human at a glance in `git log`, not
just "an agent." Resolve this once per session, not once per commit:

1. Check `git config user.name` (and `user.email`). If it's already set to
   something that looks like a real name — not empty, not a placeholder
   like `user`/`admin`, not a bare hostname like `DESKTOP-1A2B3C` — use it
   as-is. Don't second-guess a properly configured git identity.
2. If it's unset or looks like a placeholder, check the OS username as a
   weak hint (`whoami` on macOS/Linux, `$env:USERNAME` on Windows/
   PowerShell) — but confirm it with the human instead of assuming it's
   their real name.
3. If it's still unclear, just ask: *"What name should I credit you as in
   commit messages?"* One question, and attribution is fixed for the rest
   of the session.

Once you know it, add it as its own trailer on every commit, alongside
whatever agent-identity trailer your tooling already appends (this repo's
convention is `Co-Authored-By: <Agent Name> <agent-noreply-email>`):
```
Paired-with: <Human Name>
Co-Authored-By: <Agent Name> <agent-noreply-email>
```
This is deliberately visible in plain `git log` output with no extra flags
— even when `git config user.name` is already correct and this is
technically redundant with `git log --format='%an'`, keep adding the
trailer anyway. The goal is zero-effort scanning, not deduplicating
identity sources.

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
- Robin (assisted by his AI agent, acting in a team-lead review capacity)
  is currently the primary reviewer across the team's PRs — expect review
  from that pairing rather than seeking a different approver or self-merge.
  This does not change anything above: no PR self-merges regardless of who
  opened it or who reviews it, and the reviewing agent asks its human for
  explicit go-ahead before merging someone else's PR too — review recommends,
  a human still merges.

## Local development setup (optional — ask first)

A running local dev server is **not required** to contribute. The mandatory
gate is the test suite + typecheck (above), and neither needs a running
server or database. Treat local setup as opt-in, per person:

**At the start of a session, ask the human:** *"Do you want me to set up and
run a local dev server for this task, or should I just verify with
tests/typecheck and go straight to a PR?"*

- If they say no, or don't have credentials/tooling handy right now: that's
  fine — proceed with the normal test+typecheck verification, commit, and
  open the PR. Don't treat a local run as blocking or push back on "no".
- If they say yes, walk through the steps below. Installing dependencies and
  running the NestJS/Expo dev servers is normal, low-cost dev-loop work and
  fine to just do. A native mobile build is a different order of cost — see
  "Local builds" at the end of this section, and ask separately before that.

### Toolchain versions — match the repo, not your machine

CI (`.github/workflows/ci.yml`) and Render (`render.yaml`) both pin **Node
20** for install/build/test. Check what you're on first:
```
node -v && npm -v
```
If you're on a different major version, switch before installing —
`nvm install 20 && nvm use 20`, or `volta pin node@20`. A Node mismatch is a
common source of native-module install failures, and can hide
lockfile/behavior differences that only surface when CI runs your PR on
Node 20. Don't edit `package.json` engines or re-generate a lockfile to fit
whatever's on your machine — match your machine to the repo.

Package manager is `npm`; `frontend/package-lock.json` and
`backend/package-lock.json` are both committed and authoritative. Use
`npm ci` for a clean install that matches the lockfile exactly. Only use
`npm install` when you're deliberately adding/bumping a dependency, and
commit the resulting lockfile diff alongside the code change that needed it.

### Backend — NestJS + Postgres via Supabase

1. `cd backend && npm ci`
2. `cp .env.example .env`, then fill in real values. **Ask the human for a
   dev/staging Supabase project's credentials** (`DATABASE_URL`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_SECRET`, `JWT_SECRET`) — never guess these or reuse
   production values from memory or a prior session.
   - Use the **direct/session** connection string (port `5432`), not the
     pooler URL — you'll be running migrations against it, which the
     pooler can't do.
   - This backend depends on a Supabase-managed `auth.users` trigger
     mirroring into `public.users` (`supabase_setup.sql`) — a bare local
     Postgres container is not a drop-in substitute for real dev work. Only
     use the Dockerized fresh-DB flow below for schema/migration checks,
     not as your everyday database.
   - Leave `REDIS_URL` unset locally; the app falls back to an in-memory
     store, which is fine for a single dev instance.
   - Leave `NODE_ENV` unset (or `development`) locally — `production` mode
     enforces stricter checks (e.g. `CORS_ORIGIN` can't be `"*"`) meant for
     Render only, and will refuse to boot with the dev defaults.
3. `npm run migration:run` — applies any migrations your dev DB is missing.
4. `npm run start:dev` — serves on `http://localhost:8080/api` by default
   (`PORT` env var overrides; the global prefix is always `/api`, so health
   is `http://localhost:8080/api/health`).

Optional, only when a PR touches a migration:
`bash scripts/verify-fresh-db.sh` proves the full migration chain plus the
Supabase auth trigger apply cleanly to an empty Postgres. Requires Docker —
ask the human before running it if you're not sure Docker is set up on
their machine.

### Frontend — Expo / React Native

1. `cd frontend && npm ci`
2. **No `.env` is required just to run the app** — `app.config.ts` bakes in
   public fallback values, including `apiBaseUrl` pointing at the **live
   production API** (`https://api.upcheck.in/api`). That means `expo start`
   with no `.env` talks to production. To point at a locally running
   backend instead, create `frontend/.env`:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://<your-machine-LAN-IP>:8080/api
   ```
   `localhost` won't resolve from a physical device or most emulators — use
   your machine's LAN IP, or `adb reverse tcp:8080 tcp:8080` for a
   USB-connected Android device/emulator (then `http://localhost:8080/api`
   works as-is). Ask the human which setup they use.
3. This app uses native modules (Google Sign-In, Truecaller, push
   notifications) that **are not compatible with Expo Go**. Running it on a
   device/emulator needs a development-client build (`eas.json`'s
   `development` profile) already installed, then
   `npx expo start --dev-client`. Building that dev client is a full native
   build — see "Local builds" below, and ask first.
4. For verification without a device or dev-client build, `npx tsc --noEmit`
   plus the Jest suite (the mandatory gate above) don't require a running
   app at all — that's the right fallback whenever a full run isn't set up.

### Local builds — ask separately, still opt-in

A native build (`expo run:android`, `expo run:ios`, `eas build --local`, or
opening the project in Android Studio/Xcode) is a different order of cost
than the dev-loop steps above: large downloads, real RAM/disk pressure, and
platform SDKs that may not be installed. Before attempting one:
1. Ask the human first — never assume the toolchain or resources exist,
   even if they said yes to local setup in general.
2. Confirm what's actually available (`npx expo-doctor`, `adb devices`,
   installed Xcode/Android Studio version, free RAM/disk) before starting.
3. If declined, or the tooling isn't there, fall back to `tsc --noEmit` +
   the test suite as your verification, and say so plainly — don't claim
   the UI was verified when it wasn't.

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
- **Local builds/build-checks are opt-in per person and must be asked about
  first** — see "Local development setup" above for the full flow
  (dev-server setup vs. native builds specifically).

## When you're not sure

Stop and ask the human rather than guessing — especially for: merge
conflicts, ambiguous ownership of a file/area, anything destructive
(`reset --hard`, force-push, dropping data), or any tradeoff between
correctness and speed. Pausing costs a minute; a wrong guess in this
codebase has repeatedly cost hours (see the migration landmine above).
