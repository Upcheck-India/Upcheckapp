# Data breach runbook

Internal process backing Privacy Policy §7 ("If a breach affects your personal data..."). If you're
reading this at 2 a.m. because something looks wrong, follow it in order — do not improvise the
notification step.

This is a process document, not a legal opinion. It exists so the promise in the privacy policy is
something a human can actually execute under pressure.

## What counts as a breach

Any confirmed unauthorized access to, disclosure of, alteration of, or loss of personal data we hold
— account data, farm records, photos, or anything in transit or at rest across our providers
(Supabase, Render, Cloudflare R2, Sentry, PostHog, Expo, Brevo). A near-miss with no confirmed
exposure is not a breach for this runbook, but log it and review whether it should have been.

## 1. Contain (immediately)

- Identify the affected system(s) and revoke/rotate the credential, key, or access path that caused
  it (Supabase service-role key, `ADMIN_API_KEY`, JWT secret, provider API key, etc.).
- If a specific account or a small set of accounts is compromised (not a systemic issue), force
  sign-out / invalidate sessions for those accounts.
- Stop the bleeding before you scope it fully — contain first, investigate in parallel.

## 2. Assess scope (within hours, not days)

- What data was exposed: which fields, which tables/records, how many users/farms.
- Was it accessed, or only exposed (e.g. a misconfigured bucket with no evidence of access)? Check
  provider access logs (Supabase logs, Render logs, R2 access logs, Sentry/PostHog if relevant).
- Is it ongoing or contained?
- Does it include anything in Privacy Policy §2 that's sensitive by nature — passwords (should
  always be hashed, never exposed as plaintext), phone numbers, financial/transaction records,
  photos?

Write this down as you go. You will need a factual timeline for the notification and for your own
post-mortem.

## 3. Notify (target: within 72 hours of confirming the breach)

This is the step Privacy Policy §7 promises. Two notifications, both required if personal data is
affected:

- **Affected users** — email (via Brevo) to every account whose personal data was exposed. Plain
  language: what happened, what data, what we've done to contain it, what they should do (e.g.
  change password, re-verify), and the contact address (`admin@upcheck.in`) for questions.
- **Data Protection Board of India** — notify per the DPDP Act's breach-notification requirements.
  *(Human task: confirm the current DPDP Board notification channel/form at the time of the
  incident — the mechanism may not be identical to what existed when this runbook was written.)*

"Without delay" in the policy means: don't wait for a perfect root-cause writeup. Send an initial
notification with what you know, and a follow-up if the picture changes materially. 72 hours is the
internal target, not a legal ceiling we're asserting — treat it as the bar to beat, not the deadline
to use up.

## 4. Fix and verify

- Patch the actual cause (code fix, config fix, provider setting), not just the symptom.
- Confirm the fix closes the path — re-test the specific access route that was exploited.
- Rotate any credential that was anywhere near the incident, even if not confirmed compromised.

## 5. After

- Write a short internal post-mortem: what happened, what we told users and when, what changed so
  it can't happen the same way twice.
- If the breach revealed a gap in this runbook itself, update this file in the same PR as the fix.

## Who does what

Currently a small team — whoever is on point for backend/infra handles containment and scoping;
whoever can send from `admin@upcheck.in` (or has Brevo access) sends the user notification. No
on-call rotation or named incident commander exists yet; if that changes, record it here.
