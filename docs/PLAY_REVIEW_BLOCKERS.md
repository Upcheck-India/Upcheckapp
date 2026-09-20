# Play Review Blockers — one-page summary

**For:** the owner, to act on today.
**Companion to:** `docs/PLAY_STORE_SUBMISSION.md` (the full submission process)
and `docs/superpowers/specs/2026-09-20-compliance-privacy-and-store-readiness-design.md`
(the design this doc summarizes the consequences of).
**Last updated:** 20 September 2026.

---

## Why production review is likely stalled

**`READ_CALL_LOG` and `ANSWER_PHONE_CALLS` are the immediate problem.**

- Google's [July 2026 policy update](https://support.google.com/googleplay/android-developer/answer/17134731)
  removed "account verification by phone call" as a permitted use of
  `READ_CALL_LOG`. **The compliance deadline was 14 August 2026** — it has
  already passed.
- The submitted build (build **13**) declares both permissions
  (`AndroidManifest.xml`) and requests them at runtime for the Truecaller
  missed-call verification flow — an *alternative* sign-in path, not core
  functionality, which is exactly the use case the policy update closed off.
- A build declaring a restricted permission for a use Play no longer permits
  is a standing rejection/suspension risk regardless of anything else in the
  submission — this is the one item that blocks everything else below.

The fix (§C0.1 of the compliance spec) is **remove the permissions and the
missed-call flow**, not write a better justification. That work is in
progress against `development` by another agent — **pending, no PR open as of
20 Sep 2026.** Do not resubmit to Play before it merges.

---

## What to check in Play Console today

Go through these in order — each can independently be why review is stuck or
slow, and some (managed publishing, verification) can silently gate
publishing even after a review passes.

1. **Policy status** (Play Console → Policy → App content, or the Policy
   status dashboard). Look for any active warning, rejection, or suspension
   notice tied to sensitive permissions or Data Safety — not just the
   in-review state.
2. **App content → Sensitive app permissions.** Confirm whether Google has
   already flagged `READ_CALL_LOG`/`ANSWER_PHONE_CALLS` with a
   request-for-justification or rejection message. If a message exists,
   record its exact wording before resubmitting — it tells you whether Google
   is applying the July 2026 policy specifically or something else.
3. **Publishing overview → managed publishing.** If managed publishing is on,
   a review pass does not go live automatically — someone has to click
   Publish. Check whether a prior approved release is sitting unpublished.
4. **Account / D-U-N-S verification.** Play Console increasingly requires
   organization identity verification (D-U-N-S number or equivalent) before a
   new app can go to production. Check Play Console → Account details for an
   incomplete or pending verification step — this can block publishing with
   no relation to the app content at all.
5. **Closed testing — 12 testers for 14 days.** Play requires a closed test
   with at least 12 testers opted in for 14 continuous days before a new app
   (from a new developer account) can go to a production listing. **Both the
   internal-testing and closed-testing tester lists are currently empty.**
   Nothing has satisfied this requirement yet. Confirm the current tester
   counts and enrollment dates in Play Console before assuming this gate is
   close to clearing.

---

## Exact order of operations to resubmit

Do not skip ahead — several of these are hard prerequisites for the next one.

1. **Merge the C0.1 fix** (remove `READ_CALL_LOG`/`ANSWER_PHONE_CALLS` from
   the manifest, `withTruecaller.js`, and the runtime request in
   `TruecallerPhoneScreen.tsx`; the sign-in screen falls back to email OTP and
   Google when one-tap is unavailable). Pending — track its PR.
2. **Merge C0.2/C0.3** in the same native build (district picker replacing
   precise location; corrected iOS permission strings). Batching these into
   one build avoids a second native-build cycle. Pending.
3. **Update Data Safety in Play Console** using the corrected table in
   `docs/PLAY_STORE_SUBMISSION.md` — Photos as collected, location per
   whichever of C0.2's outcomes landed, SMS/call-log as not collected. Do
   **not** answer "deletable by user = Yes" until the photo spec's F1 ships
   (record/account deletion actually removing R2 objects) — see the flag in
   that doc's Data Safety section.
4. **Fill in real test credentials** — a dedicated demo account with
   synthetic farm data, never a real farmer's account (see "Test credentials
   for App Access" in `PLAY_STORE_SUBMISSION.md`). Take store screenshots from
   the same account.
5. **Set content rating / target audience to 18+**, matching Terms §1 and
   Privacy Policy §10 — not Everyone.
6. **Rotate every credential in the checklist** at the top of
   `PLAY_STORE_SUBMISSION.md` (Upstash, Render, `ADMIN_API_KEY`, DB password,
   Supabase service-role key, Brevo, plus the R2 access key and PostHog key
   exposed in chat) before doing anything else with production access.
7. **Clear the Play Console gates from the section above** — policy status,
   managed publishing, account verification, and the 12-testers/14-day closed
   test — in whatever order Play's own console requires; some of these run in
   parallel with steps 1–6 (e.g. you can start accruing closed-testing days
   on a build that still has the old permissions, since compliance and
   testing are separate gates, but do **not** promote that build to
   production).
8. **New native build, new versionCode**, built from `master` after C0.1–C0.3
   land and `docs/legal/*` (generated from `frontend/src/legal/content.ts`)
   is regenerated per Phase C1 of the compliance spec, if that phase has also
   landed by then.
9. **Resubmit**, following `docs/PLAY_STORE_SUBMISSION.md`'s submission
   procedure end to end, including the SHA-1 re-registration warning at the
   top of that doc (Play App Signing changes the fingerprint Google Sign-In
   and Truecaller are registered against).

**Do not resubmit to production before step 1 lands.** Every other fix in
this list is worth doing, but the call-log permission is the one Google has
already told the industry, in writing, is non-compliant.
