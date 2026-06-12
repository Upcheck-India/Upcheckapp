# Migrating Upcheck from your personal account to the organization account

**Goal:** every service Upcheck depends on (database, auth, hosting, email,
OAuth, app stores, code) ends up owned by the organization, with your personal
account removed.

**Why now is the best time:** the app is not on the Play Store yet and has no
real users. Downtime doesn't matter, and nothing painful (live user sessions,
published store listings, verified sender domains in active use) exists yet.
After launch, several of these steps become much harder.

**The single most important rule:** wherever a service offers a
**"transfer ownership"** option, use it instead of creating a new
project/account. A transfer keeps all your URLs, keys and IDs exactly the
same, which means **no code changes and no app rebuild**. Creating things
fresh changes IDs and forces you to update the app. The table below shows
which is which.

| # | Service | What it does for Upcheck | Method | Code changes needed? |
|---|---------|--------------------------|--------|---------------------|
| 1 | Supabase | Database + user accounts | **Transfer project** (built-in) | None |
| 2 | Google Cloud | Google Sign-In OAuth clients | **Add org as owner** of the project | None |
| 3 | Render | Backend API hosting | **Transfer service** to org workspace | None (if transferred) |
| 4 | Brevo | Sends emails (verification, reset) | New org account + new API key | None (env var only) |
| 5 | Truecaller console | Phone sign-in | New org account + re-register app | One file (partner key) |
| 6 | Expo / EAS | Builds the Android app | **Transfer project** (built-in) | Possibly `owner` field |
| 7 | GitHub | Source code | **Transfer repository** (built-in) | Update local git remote |
| 8 | Google Play | App store | **Create directly as org** (nothing to move) | None |

Work through the phases in order — later phases assume earlier ones are done.
Each phase ends with a ✅ **Verify** step. Don't move on until it passes.

---

## Phase 0 — Preparation (15 minutes)

1. **Create or identify the organization's email address** that will own
   everything (e.g. `tech@yourcompany.com` or a Google Workspace account).
   Don't use a second personal Gmail — use an address the company controls,
   so the accounts survive any individual leaving.
2. **Set up a shared password manager entry** (or at minimum a private
   document) where you will record, for each service: the org login email,
   the password, and any API keys generated. You will be creating several
   new credentials in this migration — capture them as you go, not later.
3. **Make a one-page inventory** by copying the table above and adding a
   "done" column. Tick items off as you complete each phase.
4. Keep your **personal account logins working** until the very end
   (Phase 9). You need to be logged into both sides for every transfer.

---

## Phase 1 — Supabase (database + all user accounts)

Supabase has a built-in project transfer. Your project keeps its URL
(`https://hporygudvkfoegxzsivt.supabase.co`), all API keys, the database, and
every auth user. **Nothing in the app or backend changes.**

In Supabase, a "project" lives inside an "organization". Your personal
account has a default organization; the goal is to move the project into an
organization owned by the company email.

1. **Create the org's Supabase account:** log out, go to
   [supabase.com](https://supabase.com), sign up with the organization email.
2. **Create an organization** under that account if one wasn't created
   automatically (Dashboard → organization dropdown, top-left → *New
   organization*). Give it the company name. The free plan is fine —
   the plan must simply be equal or higher than what the project uses today.
3. **Log back into your personal account** and invite the org account as a
   member of your *current* organization: Dashboard → your organization →
   **Team** → *Invite member* → enter the org email → role **Owner**.
   Accept the invite from the org account's inbox.
4. Now do the reverse so your personal account can push the project *into*
   the new organization: from the **org account**, go to its organization →
   **Team** → invite your personal email as **Owner** (temporary — removed in
   Phase 9). Accept it.
5. From either account, open the **project** → **Project Settings** →
   **General** → find **Transfer project** → choose the organization you
   created in step 2 → confirm.
   - If the transfer button complains about plans or add-ons, match the new
     organization's plan to the old one first, then retry.
6. Nothing else changes: `SUPABASE_URL`, the anon key, the service-role key,
   the database, and all users stay identical.

✅ **Verify:** log into the **org account only** (log out of personal) and
confirm you can see the project, its **Settings → API** keys, and
**Authentication → Users**. Then confirm the app's backend still works
against it (Phase 3's verify step covers this too).

> 🧹 While you're in **Authentication → Users**: delete the leftover test
> accounts whose emails look like `staqt.io+upchecksmoke…@gmail.com` /
> `staqt.io+smokedbg…@gmail.com` — they're disposable accounts from API
> testing.

---

## Phase 2 — Google Cloud (Google Sign-In)

Your three OAuth client IDs (web, iOS, Android) live inside a Google Cloud
**project** on your personal Google account. The client IDs are baked into
the app (`app.config.ts`) and registered in Supabase — so the one thing you
must NOT do is create new OAuth clients. Instead, give the org ownership of
the existing project.

1. Log into [console.cloud.google.com](https://console.cloud.google.com)
   with your **personal** account and select the project that contains the
   OAuth clients (check **APIs & Services → Credentials** — you should see
   the client IDs starting with `557249592391-`).
2. Go to **IAM & Admin → IAM** → **Grant access**:
   - New principal: the organization's Google account email.
   - Role: **Owner** (under *Basic*).
   - Save. The org account may receive an email it must accept.
3. Log in as the **org account** and confirm it can open the same project
   and see **APIs & Services → Credentials** with all three client IDs.
4. *(Optional, later)* If the company has Google Workspace, the project can
   additionally be migrated into the company's Cloud *organization*
   (IAM & Admin → Settings → Migrate). This is nice-to-have, not required —
   org-account ownership is the part that matters.
5. **Do not remove your personal account from IAM yet** — that happens in
   Phase 9 after everything is verified.

✅ **Verify:** from the org account, open **APIs & Services → Credentials**
and confirm you can *edit* the Android OAuth client (you'll be adding the
Play App Signing SHA-1 there at release time — see
`docs/PLAY_STORE_LAUNCH.md`).

---

## Phase 3 — Render (backend hosting)

Two options. **Option A keeps the current URL** baked into the app
(`https://upcheckapp-c612.onrender.com/api`) and is preferred. Option B gives
a fresh start (and a new URL → one code change + rebuild).

> ⚠️ Context: as of 2026-06-12 the service at `upcheckapp-c612.onrender.com`
> is **down** — it accepts connections but never responds (a crash-looping
> deploy looks exactly like this). Whichever option you pick, also fix the
> two most likely causes, listed under "Fix the deploy" below.

### Option A — transfer the existing service (keeps the URL)

1. Log into [dashboard.render.com](https://dashboard.render.com) with the
   **org email** and create the workspace (Render calls accounts/teams
   "workspaces"). On a paid team plan you can instead create a team and
   invite members.
2. From your **personal** Render account, invite the org email to your
   current workspace (Workspace settings → Members), or open the service →
   **Settings** → look for **Transfer ownership / Transfer to workspace**
   and choose the org workspace.
   - Render's transfer flow moves the service *with its environment
     variables and its `onrender.com` URL intact*.
   - If you can't find a transfer option on your plan, use Option B.
3. Confirm the service now appears in the org workspace.

### Option B — recreate in the org workspace (new URL)

1. In the **org** workspace: **New → Blueprint**, connect the GitHub repo
   (after Phase 7, or connect your personal repo temporarily) — Render reads
   `render.yaml` and creates `upcheck-backend`.
2. Fill in every `sync: false` env var (next section).
3. The new service gets a new URL like `https://upcheck-backend-xxxx.onrender.com`.
   Update the default in `frontend/app.config.ts` → `apiBaseUrl` to the new
   URL **including the `/api` suffix**, and rebuild the app.
4. Delete the old service from the personal account (Phase 9).

### Fix the deploy (do this in either option)

In the service's **Environment** tab, make sure ALL of these exist —
`render.yaml` documents the same list:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `SUPABASE_URL` | `https://hporygudvkfoegxzsivt.supabase.co` |
| `SUPABASE_ANON_KEY` | from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API — **boot fails without this** |
| `DATABASE_URL` | **must be the pooler URL** — see below |
| `BREVO_API_KEY` | from Phase 4 |
| `SMTP_SENDER_NAME` | `Upcheck` |
| `SMTP_SENDER_EMAIL` | your verified sender address |
| `FRONTEND_URL` | your site URL (used in email links) |

**The `DATABASE_URL` trap:** Render has no IPv6 networking, and Supabase's
*direct* database hostname (`db.hporygudvkfoegxzsivt.supabase.co`) is
IPv6-only. If `DATABASE_URL` uses the direct hostname, the backend hangs
forever trying to connect and the deploy never becomes healthy — which
matches the current outage exactly. Use the **Session pooler** URL instead:
Supabase Dashboard → **Connect** (top of the project page) → *Session
pooler* → copy the URI (it looks like
`postgresql://postgres.hporygudvkfoegxzsivt:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`).

After saving env vars, trigger **Manual Deploy → Deploy latest commit** and
watch the **Logs** tab until you see `Backend listening on 0.0.0.0:10000`.

✅ **Verify:** `curl https://<your-service>.onrender.com/api/health` returns
`{"status":"ok", …}` within a few seconds. Then sign up + sign in from the
app (or with curl) to prove auth works end-to-end against production.

---

## Phase 4 — Brevo (transactional email)

Brevo doesn't transfer accounts, but nothing here is precious yet — the API
key is just an env var.

1. Create a new Brevo account with the **org email** at
   [brevo.com](https://www.brevo.com).
2. Add and verify your **sender** (Brevo → Settings → Senders & domains).
   Verify the domain with the DNS records Brevo shows you if you'll send
   from `noreply@yourcompany.com`; a single verified sender address is
   enough to start.
3. Generate an API key: Settings → **SMTP & API** → *API keys* → create.
4. Put the new key into Render → your service → Environment →
   `BREVO_API_KEY`, and set `SMTP_SENDER_EMAIL` to the verified sender.
   Save → redeploy.

✅ **Verify:** use the app's **Forgot password** flow with your own email and
confirm the email arrives (check spam the first time).

---

## Phase 5 — Truecaller developer console

Truecaller has no self-serve transfer. Since you haven't shipped, the clean
path is to register fresh under the org.

1. Create an org account at
   [developer.truecaller.com](https://developer.truecaller.com) with the org
   email.
2. Create the app entry with the package name **exactly** `com.upcheck.app`.
3. Register the SHA-1 fingerprints (commands are in `README-AUTH.md` →
   "Truecaller setup"): debug keystore now; the release/upload and **Play App
   Signing** SHA-1s at release time.
4. Copy the new **Partner Key** into
   `frontend/android/app/src/main/res/values/partner-keys.xml` (this file is
   git-ignored; replace the placeholder value).
5. Add at least three test phone numbers on the console (required for QA).
6. If the old app entry on your personal account is still registered, delete
   it (in Phase 9) so the package name isn't claimed twice — if the console
   refuses the new registration because the package is taken, email
   Truecaller support referencing both accounts.

✅ **Verify:** build a debug APK on a real Android device with Truecaller
installed and confirm the One-Tap bottom sheet appears on the Truecaller
login screen.

---

## Phase 6 — Expo / EAS (app builds)

Your `app.config.ts` already says `owner: "utpl-in"`. First find out what
`utpl-in` is:

1. Log into [expo.dev](https://expo.dev). Look at the account switcher
   (top-left).
   - If **utpl-in is an Organization** and the company controls it: you're
     nearly done — just invite the org email as **Owner** (Organization
     settings → Members) so it isn't tied to your personal login alone.
   - If **utpl-in is your personal username**: create an organization
     (account switcher → *Create organization*), then transfer the project:
     open the project (ID `f3274022-ae8a-4be6-9085-23f935542a4c`) →
     **Settings** → *Transfer project* → select the new organization. Then
     update `owner:` in `frontend/app.config.ts` to the organization's slug
     and commit.
2. EAS keeps the project ID through a transfer, so builds keep working.
   Your Android upload keystore (if EAS manages it) moves with the project.

✅ **Verify:** `npx eas build:list` (logged in as the org / from the repo)
shows the project without errors, and `expo.dev` shows the project under the
organization, not your personal account.

---

## Phase 7 — GitHub (source code)

GitHub transfers repositories cleanly, with automatic redirects.

1. Create the GitHub **organization** (github.com → + menu → *New
   organization*) or use the existing one, and make sure your personal
   account is an org **owner** for now.
2. Go to `github.com/Kiransekar/Upcheckapp` → **Settings** → scroll to the
   **Danger Zone** → **Transfer ownership** → type the organization name →
   confirm.
3. What carries over automatically: code, branches, PRs, issues, releases,
   and **Actions secrets**. What to re-check afterwards:
   - **Settings → Secrets and variables → Actions** — confirm any secrets
     your workflows need are present.
   - Third-party app installs (e.g. the Render ↔ GitHub connection): re-link
     the repo in Render (service → Settings → Build & Deploy) if auto-deploy
     stops triggering.
4. On your machine, point the remote at the new home (old URLs redirect, but
   be explicit):
   ```bash
   cd ~/UPCHECKAPP
   git remote set-url origin https://github.com/<ORG_NAME>/Upcheckapp
   git remote -v   # confirm
   ```

✅ **Verify:** `git fetch` works, the repo shows under the org on github.com,
and a test push to a branch triggers the Android build workflow.

---

## Phase 8 — Google Play Console (do this one EARLY)

There is nothing to migrate — you haven't published. But **create the Play
developer account as an organization from day one**; converting a personal
Play account to an organization later is painful, and publishing a company
product from a personal account looks wrong to users ("offered by Kiran
Sekar" vs "offered by Your Company").

Start this phase **in parallel with the others**, because verification is
the slowest step of the whole migration:

1. An **organization** Play Console account requires a **D-U-N-S number**
   (a free business identifier from Dun & Bradstreet). Check whether the
   company has one at [dnb.com](https://www.dnb.com/duns.html); if not,
   request it — issuing can take **up to 30 days** in India.
2. Once you have the D-U-N-S number: go to
   [play.google.com/console/signup](https://play.google.com/console/signup),
   sign in with the **org Google account**, choose **An organization**, pay
   the one-time $25 fee, and complete identity verification (company
   documents + the D-U-N-S number).
3. After verification, create the app entry (`com.upcheck.app`), enable
   **Play App Signing**, and follow `docs/PLAY_STORE_LAUNCH.md` for the
   listing requirements (privacy policy URL, Data safety form, content
   rating).
4. Remember the cross-registrations once Play App Signing exists:
   - Play App Signing SHA-1 → **Truecaller console** (Phase 5 account).
   - Play App Signing SHA-1 → **Android OAuth client** in Google Cloud
     (Phase 2 project).
   - Android OAuth client ID → Supabase → Authentication → Providers →
     Google → *Authorized Client IDs* (alongside the web client ID).

✅ **Verify:** the Play Console shows the org name as the developer, and an
internal-testing upload of the AAB installs and signs in (email + Google +
Truecaller) on a real device.

---

## Phase 9 — Cleanup and lockdown (after EVERYTHING above is verified)

Do these only when every ✅ above has passed — they remove your safety net.

1. **Rotate the secrets your personal account ever held**, so old copies
   (laptops, shell history, old emails) can't reach production:
   - Supabase service-role key: Settings → API → *Reset* the service-role
     key → update `SUPABASE_SERVICE_ROLE_KEY` on Render → redeploy.
   - Database password: Settings → Database → *Reset password* → update
     `DATABASE_URL` on Render → redeploy.
   - Brevo: the key is already new (Phase 4). Delete any old personal-account
     Brevo keys.
2. **Remove your personal account's access** (or downgrade to least
   privilege if you still work in these daily — but as a *member of the org*,
   not as the owner):
   - Supabase: org → Team → remove personal email.
   - Google Cloud: IAM → remove personal email's Owner role.
   - Render: old workspace — delete the dead old service if you used
     Option B; remove personal membership from the org workspace or
     downgrade it.
   - GitHub: org → People → change your personal account from Owner to
     Member (keep at least one other org owner first!).
   - Expo: organization members → adjust roles.
   - Truecaller: delete the app entry on the personal account.
3. **Record everything in the password manager**: org logins, where each
   secret lives, and the date keys were rotated.
4. Run one final end-to-end check: fresh install of the app → sign up with
   email → verify the email arrives → sign in with Google → sign in with
   Truecaller → create a farm/pond → log water quality → delete the test
   account from the app's settings.

---

## Suggested order of execution

```
Day 1:   Phase 0 (prep) → Phase 8 step 1 (request D-U-N-S — slowest item!)
Day 1-2: Phase 1 (Supabase) → Phase 2 (Google Cloud)
Day 2-3: Phase 3 (Render + fix the outage) → Phase 4 (Brevo)
Day 3-4: Phase 5 (Truecaller) → Phase 6 (Expo) → Phase 7 (GitHub)
When D-U-N-S arrives: Phase 8 (Play Console signup + verification)
After all ✅:  Phase 9 (rotate secrets, remove personal access)
```

The only hard dependency chain is: **Phase 8 needs the D-U-N-S number**, and
**Phase 9 must be last**. Everything else can be done in any order, one
evening at a time.
