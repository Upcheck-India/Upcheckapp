# Data retention schedule

Compliance spec 2026-09-20 §C6 (and §C1.2's retention bullet). This is the
internal source of truth; the user-facing summary is section 8 of the Privacy
Policy (`frontend/src/legal/content.ts`). Change both together.

"Enforced" means code deletes or expires it. "Documented" means it is a rule we
hold ourselves to, or a setting outside the repo, with no code behind it.

There is no reliable cron on Render's free plan, so pruning rides existing
requests ("lazy"): each prune is throttled, never fails the request it rides
on, and treats a not-yet-migrated table as nothing to do.

| Category | Where | Kept for | Status |
|---|---|---|---|
| Account & profile (`users`, `profiles`, `credit_ledgers`) | Postgres | While the account is active; deleted immediately on account deletion (`ProfilesService.deleteAccount`) | Enforced (on deletion) |
| Farm records (ponds, cycles, all logs, harvests, inventory, expenses, transactions, tasks, attendance, leave requests) | Postgres | While the farm exists; removed by `ON DELETE CASCADE` when the farm, or its owner's account, is deleted | Enforced (on deletion) |
| Photos | Cloudflare R2 | Per photo spec F3: full image 12 months, thumbnail kept while its record exists. Deleted with their record/farm/account via the `photo_deletions` queue | F3 is owned by the photo work (Phase 5) — not covered here |
| `photo_deletions` — pending / failed rows | Postgres | Until the R2 delete succeeds (failed rows surface to staff) | Enforced (never pruned) |
| `photo_deletions` — done rows | Postgres | **24 months** after `done_at`, as proof the deletion happened | **Enforced** — `PhotoDeletionService.pruneDone`, at most daily, riding the F1 lazy drain |
| Email verification codes | Redis | 10 minutes (`CODE_TTL_SECONDS`), resend cooldown 60 s | Enforced (Redis TTL) |
| 2FA challenge tokens | Redis | 5 minutes (`TWO_FA_TEMP_TTL_SECONDS`) | Enforced (Redis TTL) |
| Pending 2FA enrolment secret | Redis | 10 minutes | Enforced (Redis TTL) |
| Truecaller replay nonces | Redis | `TRUECALLER_NONCE_TTL_SECONDS`, minimum 10 minutes | Enforced (Redis TTL) |
| Redis in-memory fallback (no `REDIS_URL`) | Process memory | Same TTLs, swept on a timer; gone on restart | Enforced |
| Signed photo URLs | — | 1 hour (`SIGNED_URL_TTL_SECONDS`) | Enforced (presign expiry) |
| 2FA secrets and backup codes | `users` | While 2FA is enabled; cleared on disable. Secrets encrypted at rest (C5.3), backup codes bcrypt-hashed | Enforced |
| `admin_access_log` | Postgres | **12 months** | Enforced — pruned on each `GET /admin/access-log` (C5.1) |
| `user_consents` | Postgres | **Kept** — it is the evidence of consent. No FK to `users`, so it survives account deletion by design. Horizon after deletion: **undecided — owner/lawyer task** | Documented |
| Feedback reports (+ notes) | Postgres | While the reporter's account exists (`ON DELETE CASCADE`); attachments queued for R2 deletion with the account | Enforced (on deletion) |
| Push token (`users.push_token`) | Postgres | Until the app clears it (`PushService.clearToken`), a new token replaces it, or the account is deleted | Enforced |
| In-app alerts (`alerts`) | Postgres | While the account exists — no age limit today | Documented (candidate for a horizon later) |
| Farm invite codes (`farm_invites`) | Postgres | While the farm exists; expired codes are refused, not deleted | Documented |
| Sentry (crash reports) | Sentry | Set in the Sentry console | **Owner task** — set and record the value here |
| PostHog (analytics) | PostHog | Set in the PostHog console | **Owner task** — set and record the value here |
| Render request/app logs | Render | Plan default (varies by workspace plan, see render.com/pricing) | **Owner task** — confirm the plan's value and record it |
| Database backups | Supabase | Supabase docs: daily backups kept 7 days (Pro), 14 (Team), up to 30 (Enterprise); none on Free. The policy's "within 30 days" is an upper bound that holds on any plan | **Unverified** — owner to confirm the project's plan / PITR setting |

## Owner tasks

1. Sentry: set event retention in the console; write the value in the table.
2. PostHog: set data retention in the console; write the value in the table.
3. Render: confirm the workspace plan's log retention; write it in the table.
4. Supabase: confirm the project's plan and whether PITR is on; replace
   "Unverified" with the real backup window.
5. Decide how long `user_consents` rows are kept after an account is deleted.
