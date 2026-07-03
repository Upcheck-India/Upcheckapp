# Auth & Security Guide

Everything a new backend dev needs to understand — and *maintain* — authentication,
authorization, and the security model of the Upcheck backend. Grounded in the actual
code under `backend/src/auth/`, `backend/src/farm-access/`, and `backend/src/common/`.

Related reading: [Architecture](../ARCHITECTURE.md) · [Backend guide](./backend.md) ·
[Database & migrations](./database-migrations.md) · [Operations](../OPERATIONS.md)

> The auth code was through a security audit. Two commits closed it:
> `fb75752` (Truecaller account-takeover + 2FA bypass + signup validation) and
> `fafa7fe` (remaining LOWs L1/L2/L3/L5). This document describes the **current,
> correct** behaviour. The `L#` / `Requirement #.#` tags you'll see in code comments
> map to those audit findings — keep them intact when you touch this code.

---

## 1. The Supabase client model

All auth flows go through Supabase Auth. The backend holds **one** Supabase client,
built with the **service-role key** in `SupabaseAuthService`
(`supabase-auth.service.ts`):

```ts
this.supabase = createClient(supabaseUrl, supabaseKey /* service-role */, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

Why service-role for public auth calls (the **L5** rationale, in-code): calls like
`signInWithPassword` / `verifyOtp` are *auth operations*, not RLS-bearing data
queries — the elevated key is not a data-exposure risk there. The **anon key** is
still required as an env var (`SUPABASE_ANON_KEY`) so the server fails fast on an
incomplete deployment and stays in config-parity with the frontend. The constructor
throws if any of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
is missing.

**"Confirm email" is ON in production.** After signup, Supabase will not mint a
session on sign-in until the email is verified — `signIn` surfaces the Supabase error
as `401 "Email not confirmed"`. `resend-verification` re-sends the mail. Truecaller
users are the deliberate exception (see §3).

**`auth.users → public.users` mirror.** `supabase_setup.sql` installs a
`SECURITY DEFINER` trigger `handle_new_user()` on `auth.users` (INSERT + UPDATE) that
upserts into `public.users`, deriving `username`/`first_name`/`last_name`/`provider`/
`avatar_url`/`google_id` from auth metadata and setting `email_verified` from
`email_confirmed_at`. This runs for email/password, Google, and email-verification
events. The Truecaller flow instead writes `public.users` explicitly (it needs the
phone and `email_verified:false`, see §3).

---

## 2. Authentication methods

Every endpoint below is under the controller base path **`/auth/supabase`**
(`SupabaseAuthController`). All login endpoints are `@Public()` (no bearer token
required) and rate-limited (§5). Every login path funnels through the shared
`issueSessionOrChallenge()` gate so 2FA is enforced uniformly (§4).

| Method | Endpoint | Verification happens in |
|---|---|---|
| Email/password signup | `POST /signup` | `SignupDto` (server-side) → `supabase.auth.signUp` |
| Email/password signin | `POST /signin` | `supabase.auth.signInWithPassword` |
| Passwordless email OTP (request) | `POST /login-otp/request` | `supabase.auth.signInWithOtp` |
| Passwordless email OTP (verify) | `POST /login-otp/verify` | `supabase.auth.verifyOtp` |
| Google OAuth | `POST /oauth/google` | `supabase.auth.signInWithIdToken` |
| Truecaller One-Tap (PKCE) | `POST /oauth/truecaller/exchange` | `TruecallerService.verifyOAuthCode` |
| Truecaller (legacy signed-payload / OTP token) | `POST /oauth/truecaller` | `TruecallerService.verifySignedPayload` / `verifyAccessToken` |
| TOTP 2FA login | `POST /2fa/login` | `TwoFactorService.verifyCode` |
| Password reset request | `POST /forgot-password` | `supabase.auth.resetPasswordForEmail` (client completes recovery) |
| Password change (authed) | `POST /update-password` | re-auth with current password, then admin update |
| Refresh / signout | `POST /refresh` · `POST /signout` | `refreshSession` / `admin.signOut` |

### 2.1 Email / password

- **Signup** validates the body against `SignupDto` *before* touching Supabase (this
  is the trust boundary — pre-audit the handler took an untyped inline body and
  validated nothing). `email` must be a valid email; `password` must be ≥8 chars with
  upper, lower, digit and special char. `accountType` defaults to `owner`. On
  `already registered` the service throws `409 Conflict`.
- **Signin** returns `{ user, session }` (or a 2FA challenge). The `user` object is
  passed through `sanitizeUser()` which strips `identities` (**L3**) — the frontend
  only reads `id/email/phone/user_metadata/app_metadata`.

### 2.2 Passwordless email OTP

`/login-otp/request` calls `signInWithOtp({ shouldCreateUser: false })` — it's a
**login**, never a silent signup. It is **non-enumerable** (**L1**): the service
*never* surfaces the Supabase error and always returns the same generic
*"If an account exists…"* message, so an attacker can't probe which emails are
registered. `/login-otp/verify` validates a 6-digit `otp` (`LoginOtpVerifyDto`) and
returns a real session via the 2FA gate.

### 2.3 Google OAuth (id-token)

The mobile app obtains a Google `id_token` and posts it to `/oauth/google`. The
backend hands it to `supabase.auth.signInWithIdToken('google', idToken)` — Supabase
verifies the token signature and audience. Result goes through the 2FA gate.

> **Accepted risk (documented, NOT done): Google id-token nonce.** A nonce binding
> the id-token to the client request would harden against token replay, but Google
> Sign-In SDK 16.1.2 embeds **no** nonce, and forcing Supabase to require one breaks
> Google login outright. This is a knowingly-accepted gap, not an oversight — do not
> "fix" it by enabling nonce enforcement without first confirming the SDK emits one.

### 2.4 Truecaller

Two server-side paths, both in `TruecallerService`. **Identity fields always come from
the *verified* Truecaller response, never from the request body** (a client could
otherwise forge `firstName`/`phoneNumber` into the `users` row).

- **One-Tap / PKCE exchange (current, preferred)** — `POST /oauth/truecaller/exchange`.
  The `@dhana-cs/react-native-truecaller` SDK returns an OAuth 2.0 authorization code
  + PKCE `codeVerifier` (`TruecallerOAuthExchangeDto`). `verifyOAuthCode()` does two
  server-to-server calls: (1) `POST {tokenUrl}` with `grant_type=authorization_code`,
  `client_id`, `code`, `code_verifier` → `access_token`; (2) `GET {userInfoUrl}` with
  that bearer → OIDC userinfo (`phone_number`, `given_name`, …). The client never sees
  the access token. Failures throw `401` with generic messages that never leak the
  code/token.
- **Legacy signed-payload / OTP token** — `POST /oauth/truecaller`
  (`TruecallerAuthDto`, XOR: exactly one of `payload` or `accessToken`). Retained for
  backwards compatibility.
  - *Flow A (signed payload):* `verifySignedPayload()` checks replay first
    (`NonceReplayStore.assertUnused`), RSA-verifies against every cached Truecaller
    public key (`SHA512withRSA` → `RSA-SHA512`, else `RSA-SHA256`), then decodes and
    checks `requestNonce` match + `requestTime` freshness (≤ 600 s), then records the
    nonce. Public-key cache TTL is clamped to [1 h, 24 h]; nonce TTL floor 600 s.
  - *Flow B (OTP / missed-call access token):* `verifyAccessToken()` exchanges the
    token at the Truecaller profile API and asserts the returned phone matches the
    expected phone (`normalizePhone` strips `+91`/non-digits).
  - This route maps *any* validation failure to `401 { success:false,
    message:'Invalid request' }` via `TruecallerInvalidRequestFilter` +
    `truecallerValidationPipe` (Requirement 13.4), and returns HTTP 200 for parity
    with `/signin` (Requirement 11.5). Replay/nonce stores prefer Redis
    (`RedisNonceReplayStore`) and fall back to in-memory per-process.

### 2.5 Password reset & change

- **Reset (forgotten):** `/forgot-password` calls `resetPasswordForEmail` with
  `redirectTo = FRONTEND_URL/reset-password`. The actual password update is completed
  **client-side** via the Supabase recovery session — the backend only triggers the
  email.
- **Change (authenticated):** `/update-password` requires a valid bearer token **and**
  the current password. `updatePassword()` re-authenticates via
  `signInWithPassword(email, currentPassword)` before calling
  `admin.updateUserById`. A stolen/leaked access token alone must not be enough to
  reset the password and lock the owner out.

---

## 3. Truecaller linking — the account-takeover rule

**This is the single most important invariant in the auth code. Do not weaken it.**

`signInWithTruecaller()` links a Truecaller login to an account **only by the verified
phone number**:

1. Look up `users` by `phone`. If found → mark `phone_verified`, set
   `auth_provider='truecaller'`, mint a session. Done.
2. If **not** found → create a **new** user. It is **never** linked to an existing
   account by the profile's `email`.

Why: Truecaller profile emails are **self-asserted and not ownership-verified**.
Matching on them would let an attacker set their Truecaller profile email to a
victim's address and be handed the victim's session. The pre-audit code did exactly
this; `fb75752` removed it.

New Truecaller users get a **phone-derived internal email** —
`<digits>@truecaller.temp` — with `email_confirm:false` / `phone_confirm:true`. Never
the profile's unverified email: `auth.users` enforces email uniqueness *regardless of
confirmation*, so writing the victim's real address would let an attacker pre-squat it
and block the victim's future signup. The real email stays unset until the user
verifies one through an authenticated, email-verified flow.

The service is transactional: once the `auth.users` row exists, any subsequent failure
deletes it (`admin.deleteUser`) so the system never holds an orphan auth user (which
would break the phone-match branch on retry). Supabase infra failures surface as
`503`, not a masked `401`.

---

## 4. Two-factor authentication (TOTP)

`TwoFactorService` — otplib + qrcode, secret stored on the `users` row
(`totpSecret`, `is2faEnabled`). Enrolment is two-step so a secret is only persisted
once the user proves they hold it:

1. `POST /2fa/setup` (authed) → generate secret, stash in Redis (10 min TTL), return
   `otpauthUrl` + QR data-URL.
2. `POST /2fa/enable` (authed) → verify a code against the pending secret, then persist
   + flip `is2faEnabled`.
3. `POST /2fa/disable` (authed) → requires a valid current code.
4. `GET /2fa/status` (authed).

**2FA is enforced on ALL login paths.** The shared gate `issueSessionOrChallenge()`
in the controller runs after *every* successful primary auth (password, email-OTP,
Google, both Truecaller routes). If the user has 2FA enabled it returns **no session**
— instead it stashes `{ userId, session }` in Redis under a random `tempToken`
(`auth:2fa:temp:`, 300 s TTL) and returns `{ requires2FA:true, tempToken }`. The
pre-audit gate lived only in `signin`, so 2FA was silently bypassable via OTP/Google/
Truecaller — this is the bug `fb75752` closed. **If you add a new login path, route it
through `issueSessionOrChallenge()`, not around it.**

`POST /2fa/login` completes the challenge: look up the temp token, `verifyCode()`. On
success it deletes the temp keys and returns the real session. On failure it
**increments an attempts counter in a sibling Redis key** and hard-fails after
`TWO_FA_MAX_ATTEMPTS = 5`, deleting the challenge — so a captured `tempToken` can't be
brute-forced for the full TTL. The counter is a separate key so retries never extend
the challenge's own expiry.

---

## 5. Authorization & guards

### 5.1 Global JwtAuthGuard + @Public()

`JwtAuthGuard` is registered **once**, globally, via `APP_GUARD` in
`app.module.ts` (alongside `ThrottlerGuard`). It is **not** duplicated per-controller
— duplicate registration was cleaned up in the audit; don't re-add `@UseGuards
(JwtAuthGuard)` on individual routes.

Every route is protected by default. Opt out with `@Public()`
(`decorators/auth.decorators.ts` — `SetMetadata('isPublic', true)`). The guard reads
the `isPublic` reflector metadata and skips auth when set.

Token validation: the guard extracts the `Bearer` token and calls
`supabase.auth.getUser(token)` — validation happens **on Supabase's servers**, so it's
algorithm-agnostic (works for both legacy HS256 and new-project ES256 projects). On
success it attaches `req.user = { id, email }`.

> There is also a `SupabaseAuthGuard` (`guards/supabase-auth.guard.ts`) used
> explicitly on a handful of authed auth-controller routes (`/me`, `/2fa/*`,
> `/update-password`, `/signout`, `/update`). It validates the same way (via
> `verifyAccessToken` → `getUser`) but attaches the **full** Supabase user object,
> which those handlers need.

### 5.2 Rate limiting

Global `ThrottlerModule`: **60 req/min/IP** for everything. Credential-guessing
surfaces get tighter per-endpoint limits (**L2**, in `supabase-auth.controller.ts`):

- `AUTH_THROTTLE` = 10/min — `/signin`, `/2fa/login`.
- `SENSITIVE_THROTTLE` = 5/min — `/signup`, `/login-otp/request`, `/forgot-password`.

`main.ts` sets `trust proxy` so the throttler keys on the real client IP behind the
proxy.

### 5.3 Roles

Two role systems coexist — know which is which:

- **Farm-scoped roles** (the ones that actually gate data): `owner`, `manager`,
  `worker`, `viewer` — stored per-farm on `farm_members.role`
  (`farm-access/farm-member.entity.ts`). This is what `FarmAccessService` enforces.
- **Global `Role` enum** (`roles.enum.ts`: `super_admin`, `farm_owner`,
  `farm_manager`, `worker`, `auditor`) + `RolePermissions` map — a coarser
  RBAC scaffold. Farm-scoped capabilities are the authoritative model for tenant data.

---

## 6. Multi-tenant isolation

Upcheck is multi-tenant: a user may belong to many farms, and must **never** see
another farm's data. Isolation is enforced in the app layer, with RLS as a second
line of defence.

### 6.1 App-layer: FarmAccessService (authoritative)

`FarmAccessService` (`farm-access/farm-access.service.ts`) is the **single source of
truth** for "may this user do capability C on this farm/pond?". Every farm-scoped
list/read/write routes through it:

- `getAccessibleFarmIds(userId)` — farms the user can see; **list endpoints scope to
  these ids** so other tenants' rows never appear.
- `getFarmIdsWithCapability(userId, capability)` — narrower scoping, e.g. only farms
  whose financials a user may read.
- `assertCanAccessFarm(userId, farmId, capability)` /
  `assertCanAccessPond(...)` — throw `403`/`404` on a single-resource access.

Capabilities (`farm-access/farm-capability.ts`, `CAPABILITY_ROLES`):

| Capability | Roles allowed |
|---|---|
| `READ` | owner, manager, worker, viewer |
| `WRITE_OPERATIONAL` | owner, manager, worker |
| `WRITE_MANAGEMENT` | owner, manager |
| `VIEW_FINANCIALS` | owner, manager |
| `MANAGE_WORKERS` | owner, manager |
| `OWNER_ONLY` | owner |

Member management uses `ROLE_RANK` + `canAssignRole` / `canManageMember`: owner →
manager/worker/viewer, manager → worker only; ownership transfer is a separate flow.
The service degrades gracefully to owner-only access if the `farm_members` table is
missing (Postgres `42P01`) during a deploy-before-migrate window.

### 6.2 DB-layer: RLS is defense-in-depth (SEC-1)

Row-level security on the core tables is the backstop, not the primary control. The
**anon key is RLS-locked**: if the service ever leaks the anon key or a PostgREST
query slips through, RLS prevents cross-tenant reads/writes. The service-role key
bypasses RLS by design (§1), which is why the app-layer `FarmAccessService` checks are
non-negotiable — they're the only thing scoping service-role queries.

`assertSchemaReady()` (`common/schema-guard.ts`) runs on boot and fails fast (loud
FATAL log, process exits) if the core tables (`users`, `farms`, `farm_members`,
`ponds`, `crops`) are absent — i.e. the migration chain (including the RLS/SEC-1
migration) never ran. A deploy that booted "healthy" with RLS silently off would be a
cross-tenant leak; this guard prevents that. Migrations are applied manually
(`npm run migration:run`) — see [Database & migrations](./database-migrations.md).

---

## 7. Security checklist for new endpoints

Before merging any new route, confirm:

- [ ] **Auth guard applies.** It does by default (global `JwtAuthGuard`). Only reason
      not to is a genuine pre-login flow.
- [ ] **`@Public()` is intentional.** If you added it, the route is fully
      unauthenticated — justify it and rate-limit it (`@Throttle`).
- [ ] **Farm-scoped.** Any read/list/write touching tenant data goes through
      `FarmAccessService` (`getAccessibleFarmIds` / `assertCanAccessFarm` /
      `getFarmIdsWithCapability`). Never trust a `farmId` from the body without an
      access check.
- [ ] **Validated DTO.** Body is a `class-validator` DTO, not an inline `{ ... }`
      type. The global `ValidationPipe` (whitelist) only protects typed DTOs.
- [ ] **Financials gated.** Costs / transactions / P&L / financial reports require the
      `VIEW_FINANCIALS` capability (owner/manager).
- [ ] **New login path?** Route it through `issueSessionOrChallenge()` so 2FA is
      enforced, and pass the returned user through `sanitizeUser()`.
- [ ] **No enumeration / no leaks.** Don't return distinct errors that reveal whether
      an account exists; don't echo secrets/tokens/phone numbers into responses or
      logs (use `maskPhone` for phones).

---

## 8. Quick reference — files

| Concern | File |
|---|---|
| All auth endpoints, 2FA gate, rate limits, `sanitizeUser` | `backend/src/auth/supabase-auth.controller.ts` |
| Supabase client, email/pass/OTP/Google, Truecaller linking, password change | `backend/src/auth/supabase-auth.service.ts` |
| Truecaller verification (PKCE exchange, signed payload, OTP token, nonce/key cache) | `backend/src/auth/truecaller.service.ts` |
| TOTP enrolment + verify | `backend/src/auth/two-factor.service.ts` |
| Global token guard + `@Public()` | `backend/src/auth/guards/jwt-auth.guard.ts`, `.../decorators/auth.decorators.ts` |
| Farm-scoped authorization | `backend/src/farm-access/farm-access.service.ts`, `.../farm-capability.ts` |
| Boot-time schema/RLS safety net | `backend/src/common/schema-guard.ts` |
| `auth.users → public.users` mirror trigger | `supabase_setup.sql` |
| Signup / login DTO validation | `backend/src/auth/dto/` |
</content>
