# Gate D — Server-side rejection of nonce replay

> **Task:** 14.4 in `.kiro/specs/truecaller-auth/tasks.md`
> **Type:** Manual QA gate (with automated coverage that mirrors the same scenario)

## 1. Purpose

Prove end-to-end that the running backend rejects a replay of the same `requestNonce` within the configured TTL.

This gate covers **Requirement 9.7** from `.kiro/specs/truecaller-auth/requirements.md`:

> THE TruecallerService SHALL persist every `requestNonce` from a successfully verified payload in a store with a time-to-live of at least 600 seconds, and IF a verification request arrives whose `requestNonce` is already present in that store, THEN THE TruecallerAuthEndpoint SHALL respond with HTTP status 401 and a body of `{ "success": false, "message": "Nonce already used" }`.

Concretely, the gate confirms:

- Two POSTs of the **exact same** signed body to `POST /auth/supabase/oauth/truecaller` within ≥ `TRUECALLER_NONCE_TTL_SECONDS` produce **HTTP 200** for the first and **HTTP 401** with body `{"success":false,"message":"Nonce already used"}` for the second.
- A third POST with a freshly generated `requestNonce` (re-signed against the same dev keypair) produces **HTTP 200** again, demonstrating the rejection is nonce-scoped, not user-scoped or session-scoped.

Implementation references:

- `backend/src/auth/truecaller.service.ts` — `verifySignedPayload`, `InMemoryNonceReplayStore`, `assertUnused` / `markUsed`, `resolveNonceTtlSeconds` (clamps `TRUECALLER_NONCE_TTL_SECONDS` to a 600 s floor).
- `backend/src/auth/supabase-auth.controller.ts` — `POST /auth/supabase/oauth/truecaller` route, `TruecallerInvalidRequestFilter`, validation pipe, response envelope.
- `backend/src/auth/truecaller.service.integration.spec.ts` — the `Requirement 9.7 — rejects a replay of the same nonce with "Nonce already used"` test (the canonical automated mirror of this gate).
- `backend/src/auth/truecaller.service.nonce.property.spec.ts` — Property 7 / Requirement 9.7 randomized replay coverage against `InMemoryNonceReplayStore`.
- `backend/src/auth/truecaller.service.spec.ts` — `InMemoryNonceReplayStore` unit tests (TTL boundary, lazy eviction, exact 9.7 body shape).

---

## 2. Automated verification

The automated mirror of this gate runs against the real `axios` client with `nock` interceptors and against the in-memory replay store directly. Run all three commands from the repo root.

```bash
cd backend && npx jest src/auth/truecaller.service.integration.spec.ts -t "Requirement 9.7"
cd backend && npx jest src/auth/truecaller.service.nonce.property.spec.ts
cd backend && npx jest src/auth/truecaller.service.spec.ts -t "InMemoryNonceReplayStore"
```

**Pass criteria for the automated path:** all three commands exit with code 0 and the integration test prints `Requirement 9.7 — rejects a replay of the same nonce with "Nonce already used"` as a passing case.

If the automated commands all pass, the gate may be considered **automated-pass** and the manual path below is recommended but not strictly required for sign-off, except for Gate E (release APK) where the manual path MUST be re-run against the release-signed build.

---

## 3. Manual verification preconditions

1. **Backend running locally.** Default bootstrap is `cd backend && npm run start:dev`, which listens on `0.0.0.0:${PORT:-8080}` (see `backend/src/main.ts`). Note the URL the backend prints (e.g. `http://localhost:8080`) and use it as `BACKEND_URL` below.
2. **Configured nonce TTL.** Confirm `TRUECALLER_NONCE_TTL_SECONDS` in the backend's environment. The default in `backend/.env.example` is `600` and the service clamps any lower value up to `600` (Requirement 9.7 floor). Record the effective value in §8.
3. **Valid signed body.** A request body of the shape:

   ```json
   {
     "payload":            "<base64 JSON>",
     "signature":          "<base64 RSA signature>",
     "signatureAlgorithm": "SHA512withRSA",
     "requestNonce":       "<the same nonce embedded in the decoded payload>",
     "phoneNumber":        "+91XXXXXXXXXX",
     "firstName":          "Aarav",
     "lastName":           "Sharma"
   }
   ```

   Two ways to obtain a valid body for a manual run:

   - **(A) From Gate A evidence.** Capture the JSON the Android client POSTs after a real One-Tap success. This produces a body signed by Truecaller's production keys and only works against a backend that can reach `https://api4.truecaller.com/v1/key`. Each Truecaller-issued `requestNonce` is single-use, so Gate A evidence can drive **at most one** 200 response — the replay step still works because the second POST is rejected before any Truecaller call. The "fresh nonce" step (4.5) requires a second Gate A capture.
   - **(B) From a dev keypair using the test fixture helper.** Use the same `buildSignedPayload` / `publicKeyToBase64Body` helpers defined at the top of `backend/src/auth/truecaller.service.integration.spec.ts` (around lines 32–70). Generate an RSA-2048 keypair, host the public key behind a local URL the backend can reach, and point `TRUECALLER_KEYS_API_URL` at that URL for the duration of the manual test. A Node helper script (e.g. `backend/scripts/sign-truecaller-payload.ts`) that imports the same helpers and prints both the request body and the `/v1/key` JSON the backend should fetch is the recommended path. Reset `TRUECALLER_KEYS_API_URL` to the production value when done.

4. **Curl available** with HTTP/1.1, or any equivalent client (HTTPie, Postman) capable of sending an exact byte-for-byte repeat of the request body.

---

## 4. Manual test steps

The endpoint under test is `POST {BACKEND_URL}/auth/supabase/oauth/truecaller`. For each step, save the full request body to a file (e.g. `body.json`) so the second POST is byte-identical to the first.

1. **Start the backend.**

   ```bash
   cd backend && npm run start:dev
   ```

   Wait for `Backend listening on 0.0.0.0:8080` (or the configured port).

2. **First POST — expect HTTP 200.**

   ```bash
   curl -i -X POST "$BACKEND_URL/auth/supabase/oauth/truecaller" \
     -H "Content-Type: application/json" \
     --data @body.json
   ```

   Expected: `HTTP/1.1 200 OK` with a JSON body containing `user` and `session` fields (matching the `POST /auth/supabase/signin` envelope per Requirement 11.5). Capture the full response.

3. **Second POST within TTL — expect HTTP 401, replay rejected.**

   Within `TRUECALLER_NONCE_TTL_SECONDS` of step 2 (default 600 s), repeat the exact same request:

   ```bash
   curl -i -X POST "$BACKEND_URL/auth/supabase/oauth/truecaller" \
     -H "Content-Type: application/json" \
     --data @body.json
   ```

   Do not regenerate the body. Do not change `requestNonce`. Do not re-sign.

   Expected: `HTTP/1.1 401 Unauthorized` with body exactly:

   ```json
   {"success":false,"message":"Nonce already used"}
   ```

4. **Fresh nonce — expect HTTP 200, confirms scope is per-nonce.**

   Generate a new request body with a new `requestNonce` (and matching embedded `requestNonce` inside the decoded base64 payload, re-signed against the same dev keypair). Save it as `body-fresh.json` and POST:

   ```bash
   curl -i -X POST "$BACKEND_URL/auth/supabase/oauth/truecaller" \
     -H "Content-Type: application/json" \
     --data @body-fresh.json
   ```

   Expected: `HTTP/1.1 200 OK` with the same `{user, session}` envelope as step 2. This confirms the rejection in step 3 was scoped to the nonce, not to the user, phone number, or session.

5. **(Optional, informational only) Wait past TTL and re-POST the original body.**

   Wait more than `TRUECALLER_NONCE_TTL_SECONDS` (default > 600 s) and POST `body.json` again. This step is *not* a pass/fail criterion: with the in-memory replay store the original nonce will eventually be evictable, but the original `requestTime` will also have aged past the 600 s freshness window from Requirement 9.6, so the response is more likely to be `401 {"success":false,"message":"Payload expired"}` than `200`. The integration test exercises this transition in-process with a small TTL; for a real backend run this is impractical.

   **Skip this step in routine QA.** Mark it "informational, skip in QA" in §6 unless explicitly investigating TTL behaviour.

---

## 5. Pass criteria

The gate passes if and only if **all three** of the following hold:

| # | Step | Expected status | Expected body |
|---|------|-----------------|---------------|
| 1 | First POST (step 4.2) | `200 OK` | JSON envelope with `user` and `session` |
| 2 | Replay POST (step 4.3) | `401 Unauthorized` | exactly `{"success":false,"message":"Nonce already used"}` |
| 3 | Fresh-nonce POST (step 4.4) | `200 OK` | JSON envelope with `user` and `session` |

Any deviation — wrong status, wrong message, missing fields — is a gate failure.

---

## 6. Fail troubleshooting

| Symptom | Likely cause | Where to look |
|---------|--------------|---------------|
| Second POST returns **200 instead of 401** | `InMemoryNonceReplayStore` is not wired into `TruecallerService`, or `markUsed` is not called after a successful verification, or the controller is not surfacing the 401 from `assertUnused`. | `backend/src/auth/truecaller.service.ts` (`verifySignedPayload`, `markUsed`, `assertUnused`); `backend/src/auth/supabase-auth.controller.ts` (route ordering, no try/catch swallowing the `UnauthorizedException`). Re-run automated commands in §2. |
| Second POST returns **401 but with the wrong body** (e.g. message is `"Unauthorized"`, `"Replay detected"`, missing `success` field) | The `UnauthorizedException` is being constructed with a string instead of the spec response object, or a global filter is rewriting the body. | `backend/src/auth/truecaller.service.ts` — confirm `new UnauthorizedException({ success: false, message: 'Nonce already used' })`. Confirm `TruecallerInvalidRequestFilter` only fires on `BadRequestException`. |
| **First** POST returns 401 (any message) | Signature, nonce, or key cache problem upstream of the replay store — the request never reaches `markUsed`. | Run **Gate C** first to isolate signature/forgery handling. Verify `TRUECALLER_KEYS_API_URL` resolves to a server that returns the public half of the keypair used to sign the body. Inspect backend logs for `Invalid signature`, `Nonce mismatch`, `Payload expired`, or `Public key fetch failed`. |
| First POST returns **400** instead of 200/401 | Global `ValidationPipe` rejecting the body before the route-local pipe and filter can convert to 401. | `backend/src/auth/supabase-auth.controller.ts` — confirm `TruecallerInvalidRequestFilter` is wired via `@UseFilters(...)`. |
| Both POSTs return 200 even after restart | Caller is hitting the wrong host, the body is not byte-identical between calls, or curl is encoding it differently each time. | Diff the two saved bodies with `diff body.json body.json` (sanity), confirm `Content-Type: application/json`, confirm `BACKEND_URL` resolves to the local backend and not a deployed one. |
| Replay rejection works locally but not in CI/staging | TTL is shorter than wall-clock gap between requests, or the replay store is per-instance and the load balancer fanned the two requests to different replicas. | Record `TRUECALLER_NONCE_TTL_SECONDS`. For multi-replica deployments the in-memory store is not sufficient — a shared store (Redis) is required (see design.md §"Nonce replay store"). |

---

## 7. Evidence to capture

Attach the following to the sign-off entry in §8:

1. `curl -i` output for **step 4.2** (first POST → 200) — full status line, headers, and body.
2. `curl -i` output for **step 4.3** (replay POST → 401) — full status line, headers, and body. The body MUST match `{"success":false,"message":"Nonce already used"}` exactly.
3. `curl -i` output for **step 4.4** (fresh-nonce POST → 200) — full status line, headers, and body.
4. Output of all three automated commands in §2 (jest summary line is sufficient; full output if any test failed).
5. Backend log excerpt covering the three POSTs (with `phoneNumber` masked per Requirement 13.3 — last 4 digits only).

---

## 8. Sign-off

Fill in once the gate has been executed.

| Field | Value |
|-------|-------|
| Date (UTC) | `YYYY-MM-DD` |
| Tester | `name / handle` |
| Backend commit SHA | `git rev-parse HEAD` |
| Backend URL | e.g. `http://localhost:8080` |
| `TRUECALLER_NONCE_TTL_SECONDS` (effective) | e.g. `600` |
| `TRUECALLER_KEYS_API_URL` used | e.g. `https://api4.truecaller.com/v1/key` (production) or local mock URL |
| Body source | `Gate A capture` / `dev keypair via buildSignedPayload helper` |
| Automated result (§2, all three commands) | `pass` / `fail` (link to logs) |
| Manual result (§4 steps 1–4) | `pass` / `fail` (link to evidence in §7) |
| Optional step 4.5 (TTL expiry) | `informational, skipped` / `observed: <result>` |
| Notes / deviations | |

> Gate D is signed off when the **automated result is pass** and (where required by the release checklist) the **manual result is pass** with all three §7 evidence artefacts attached.
