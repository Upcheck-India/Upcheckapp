# Render Deployment Guide

## Critical Issue: Database Connection Failed

The error `ECONNREFUSED localhost:5432` indicates that the `DATABASE_URL` environment variable is **not set** in Render. This is the most important configuration that must be set manually in the Render Dashboard.

## Step-by-Step Setup

### 1. Go to Render Dashboard

Navigate to: https://dashboard.render.com

Select your service: `upcheck-backend`

### 2. Set Environment Variables

Go to: **Environment** tab → **Add Environment Variable**

You MUST set these variables (they have `sync: false` in render.yaml, meaning they're not auto-synced):

#### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DATABASE_URL` | **MOST IMPORTANT!** Supabase PostgreSQL connection string | `postgresql://postgres.hporygudvkfoegxzsivt:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | Supabase project URL | `https://hporygudvkfoegxzsivt.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | Same as `JWT_SECRET` |
| `JWT_SECRET` | JWT signing secret | Any secure random string |

#### Optional Variables

| Variable | Description |
|----------|-------------|
| `JWT_PRIVATE_KEY` | RS256 private key (if using RS256) |
| `JWT_PUBLIC_KEY` | RS256 public key (if using RS256) |
| `REDIS_URL` | Redis connection URL (app falls back to in-memory if not set) |
| `BREVO_API_KEY` | Brevo email API key |
| `TRUECALLER_CLIENT_ID` | Truecaller SDK client ID |
| `TOTP_ENCRYPTION_KEY` | Encrypts 2FA secrets at rest (32 bytes, base64). Unset = plaintext, as before. See "2FA secret encryption" below |
| `TOTP_ENCRYPTION_KEY_PREVIOUS` | Old key, decrypt-only, only while rotating |

### 3. DATABASE_URL Format

**IMPORTANT: Use the Supabase Pooler URL (port 6543)** for better performance:

```
postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres
```

Example:
```
postgresql://postgres.hporygudvkfoegxzsivt:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**DO NOT use port 5432** - that's the direct connection which has limits on Supabase free tier.

### 4. Google OAuth Configuration

The Google OAuth Client IDs must match between:
1. Frontend (`frontend/.env` → `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*`)
2. Backend (`backend/.env` → `GOOGLE_CLIENT_ID_*`)
3. Supabase Dashboard (Authentication → Providers → Google)

**Current Client IDs (must be used everywhere):**
- Web: `557249592391-104epoeebi8ji9bkeacme4kt6urj4ef7.apps.googleusercontent.com`
- iOS: `557249592391-smcje08fcv71hh1vjhmshhvnklpmd7lo.apps.googleusercontent.com`
- Android: `557249592391-omumak2q0qnor86nj47m93ln4fsn8uv3.apps.googleusercontent.com`

### 5. After Setting Variables

Click **Save Changes** - Render will automatically redeploy with the new environment variables.

## Cold Start Behavior

Render's free tier spins down services after ~15 minutes of inactivity. When a request comes in:

1. Render starts the service (cold start ~10-30 seconds)
2. The app connects to the database
3. Health check endpoint `/api/liveness` responds
4. Service becomes "healthy" and starts serving requests

The health endpoints implemented:
- `/api/liveness` - Simple check (no database dependency, quick response)
- `/api/health` - Comprehensive check (database + memory)

## Troubleshooting

### Database Connection Errors

If you see `ECONNREFUSED`:
1. Check `DATABASE_URL` is set in Render Dashboard
2. Verify the URL format is correct
3. Ensure password is URL-encoded (special characters like `@` become `%40`)

### Google OAuth "client deleted" Error

If users see "client deleted" when signing in with Google:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Verify the Web Client ID (`557249592391-104epoeebi8ji9bkeacme4kt6urj4ef7...`) is active
3. Check authorized JavaScript origins include your domains
4. Configure the same Client ID in Supabase Dashboard → Authentication → Providers → Google

### Health Check Failures

If health check fails during cold start:
1. The `/api/liveness` endpoint should respond within 30 seconds
2. Check Render logs for startup errors
3. Verify all required environment variables are set

## Admin access: per-staff keys (`ADMIN_STAFF_KEYS`)

C5.1 — the admin dashboard's key is being split from one shared secret into
one key per staff member, so `admin_access_log` can name who read or changed
what. `admin-key.guard.ts` and `docs/superpowers/specs/2026-09-20-compliance-privacy-and-store-readiness-design.md`
§C5.1 have the full design; this is the operational rollout.

**Until you set `ADMIN_STAFF_KEYS`, nothing changes** — the shared
`ADMIN_API_KEY` keeps working exactly as it does today, just logged in
`admin_access_log` as staff `"shared-key"` instead of a named person (with a
startup warning in the logs reminding you this is still the old mode).

### 1. Generate a key per person

From `backend/`, once per staff member:

```
npx ts-node -r tsconfig-paths/register scripts/make-admin-key.ts "Robin"
```

This prints two things:
- **The raw key** — shown once. Send it to that person directly (not by
  email/Slack in plaintext if you can help it); it's what they put wherever
  the admin dashboard picks up its `x-admin-key` header from.
- **A hash line** (`"Robin": "…sha256 hex…"`) — this goes in the env var
  below. The raw key is never stored anywhere, including Render.

### 2. Set `ADMIN_STAFF_KEYS` on the backend's Render service

One JSON object, merging every staff member's hash line from step 1:

```json
{"Robin": "<hash>", "Asha": "<hash>"}
```

Render → `upcheck-backend` → **Environment** → add `ADMIN_STAFF_KEYS` with
that value → **Save Changes** (redeploys automatically).

**The moment this is set, the old shared `ADMIN_API_KEY` stops working** —
every admin request must present a key from `ADMIN_STAFF_KEYS` from then on.
Roll out keys to everyone who needs the dashboard *before* setting this, not
after, or staff still on the shared key get locked out mid-session.

### 3. Each staffer signs in to the dashboard with their own key

The admin dashboard (`admin/`) no longer holds one shared key. It has its
own `/login` page: each staffer pastes their personal raw key from step 1,
the dashboard validates it against `GET /admin/whoami` and stores it in an
httpOnly, 8-hour session cookie (`admin/src/lib/admin-key.ts`,
`admin/src/app/login/`). `middleware.ts` sends anyone without that cookie to
`/login`, and the signed-in name shows in the header with a sign-out link.

**Remove `ADMIN_API_KEY` from the admin dashboard's Vercel env** once staff
have keys and are signing in — it's read by nothing in `admin/` anymore.
(The backend's own `ADMIN_API_KEY` is unrelated and stays — see step 2.)

### 4. Adding or rotating a person later

Re-run the script for the new/rotated person, merge their hash line into the
existing `ADMIN_STAFF_KEYS` JSON (don't drop the others), save. To revoke
someone, delete their entry from the JSON — their old key stops matching
immediately.

### Migration status

`admin_access_log` (migration `1780702500000`) is **not yet applied** in
production as of this change — run `npm run migration:run` (see the main
setup section above) before relying on `GET /admin/access-log` or expecting
rows to actually persist. Until it's applied, admin requests still work
normally; logging degrades to a warning in the Render logs instead of
failing anything (see `isMissingTable` in `AdminAccessLogService`).

## 2FA secret encryption (`TOTP_ENCRYPTION_KEY`)

`users.totp_secret` is stored as `enc:v1:<iv>:<tag>:<ciphertext>` (AES-256-GCM)
once a key is set. Without a key the backend keeps writing plaintext exactly as
before and logs a warning at boot — a missing key never blocks a 2FA sign-in.
Reads accept both forms, so the steps below are zero-downtime.

**Keep the key somewhere besides Render** (a password manager). Losing it means
every enrolled user's TOTP stops working — they can still sign in with a
backup code and re-enrol, but nobody can recover the secrets.

### 1. Turn it on

1. Generate a key: `openssl rand -base64 32`
   (or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
2. Set `TOTP_ENCRYPTION_KEY` on the backend's Render service and deploy.
   From then on, new enrolments are encrypted, and an existing plaintext
   secret is re-encrypted the next time its user passes a 2FA check.
3. Encrypt the rest now, from a machine with the production DB env
   (`typeorm.config.ts`) and the same key:
   ```
   npx ts-node scripts/encrypt-totp-secrets.ts            # dry run: counts only
   npx ts-node scripts/encrypt-totp-secrets.ts --apply
   ```
   A re-run should report 0 to seal. Any row listed as UNREADABLE was not
   touched — investigate before going further.

### 2. Rotate the key

1. Generate a new key. Set `TOTP_ENCRYPTION_KEY_PREVIOUS` = the current key and
   `TOTP_ENCRYPTION_KEY` = the new one; deploy. Both keys now decrypt; writes
   use the new one.
2. Run `scripts/encrypt-totp-secrets.ts --apply` with both vars set — it
   re-seals every row still under the old key.
3. When a dry run reports 0 under the previous key, delete
   `TOTP_ENCRYPTION_KEY_PREVIOUS` and deploy.

**Never remove the key once rows are encrypted** — those users' TOTP would
fail (closed, with an error per user in the logs) until it is restored.