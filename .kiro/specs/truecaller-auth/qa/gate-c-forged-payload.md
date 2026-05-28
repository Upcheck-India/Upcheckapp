# Gate C — Server-Side Rejection of Forged Payload

> **Spec:** `truecaller-auth`
> **Manual QA Gate:** C (`tasks.md` task 14.3)
> **Validates:** Requirement 9.3
> **Endpoint under test:** `POST /auth/supabase/oauth/truecaller`

## 1. Purpose

Confirm Requirement 9.3 against the deployed backend surface:

> If signature verification against every public key returned by
> `https://api4.truecaller.com/v1/key` fails, then `TruecallerAuthEndpoint`
> SHALL respond with HTTP status **401** and a body of
> `{"success": false, "message": "Invalid signature"}`.

In source the contract is enforced at:

- `backend/src/auth/truecaller.service.ts` — `verifySignedPayload`, the
  RSA verification loop (`keys.some(...)`), and the
  `UnauthorizedException("Invalid signature")` throw site (search for
  `message: 'Invalid signature'`).
- `backend/src/auth/supabase-auth.controller.ts` — `truecallerOAuth`
  dispatches signed payloads to `verifySignedPayload`. The
  `UnauthorizedException` raised by the verifier is intentionally NOT
  caught by `TruecallerInvalidRequestFilter`, so Nest maps the verifier
  message straight to HTTP 401 with the body unchanged.
- `backend/src/auth/truecaller.service.integration.spec.ts` — automated
  reference, covers both "no key in cache verifies" and "one byte
  flipped" mutations.

The gate is satisfied only when both the **automated** and **manual**
verifications below pass.

## 2. Automated Verification

The same scenario is exercised by Jest. Run the targeted test before
attempting the manual path and again after, to confirm the verifier
message has not regressed.

```bash
cd backend
npx jest src/auth/truecaller.service.integration.spec.ts -t "Requirement 9.3"
npx jest src/auth/truecaller.service.signature.property.spec.ts
```

Expected: both commands exit 0. Capture the test runner summary lines
(test count + duration) and paste them into Section 8 below.

The relevant cases inside the integration spec are:

- `Requirement 9.3 — rejects a forged payload with "Invalid signature" when no cached key verifies`
- `Requirement 9.3 — rejects a one-byte tampered payload with "Invalid signature"`

## 3. Manual Verification — Preconditions

1. **Backend running locally** on `http://localhost:8080` (default `PORT`
   in `backend/src/main.ts`):

   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

   Confirm the log line `Backend listening on 0.0.0.0:8080` appears.

2. **A valid signed payload** to start from. Two options:

   - **Option A — capture from a real device.** Run a debug build that
     completed Gate A and intercept the One-Tap POST to
     `/auth/supabase/oauth/truecaller` (Charles, mitmproxy, or
     `adb logcat` on the bridge). Copy the JSON body verbatim into
     `valid.json`. This is the most realistic input.

   - **Option B — synthesize a payload from the test fixture.** When
     Option A is not available, generate a self-signed payload using the
     same helper (`buildSignedPayload`) the integration test uses, then
     point the backend's key cache at the matching public key by
     overriding `TRUECALLER_KEYS_API_URL` to a local fixture server. The
     helper lives in
     `backend/src/auth/truecaller.service.integration.spec.ts` (lines
     ~43–69). Copy that function plus `generateKeyPair` and
     `publicKeyToBase64Body` into a one-off Node script, e.g.:

     ```bash
     # backend/scripts/synthesize-truecaller-payload.ts (do NOT commit)
     # 1. Generate keypair
     # 2. Print public key (base64 SPKI body) to start a local /v1/key server
     # 3. Print { payload, signature, signatureAlgorithm, requestNonce, phoneNumber, firstName, lastName }
     ```

     Serve the public key from `http://127.0.0.1:9090/v1/key` returning
     `[{ "keyName": "tc-local", "key": "<base64-spki-body>" }]`, then
     start the backend with
     `TRUECALLER_KEYS_API_URL=http://127.0.0.1:9090/v1/key npm run start:dev`.

     Whichever you use, the body MUST contain all of:
     `payload`, `signature`, `signatureAlgorithm`, `requestNonce`,
     `phoneNumber`, `firstName`, `lastName`.

3. **`curl` and `jq`** on the tester's machine.

## 4. Manual Test Steps

Run these in order. Save every response to disk for the evidence section.

### 4.0 Baseline — unmodified payload returns 200

```bash
curl -i -X POST http://localhost:8080/auth/supabase/oauth/truecaller \
  -H "Content-Type: application/json" \
  -d @valid.json
```

Expected: HTTP **200**, body shape
`{ "message": "Truecaller authentication successful", "user": {...}, "session": {...} }`.

If this does not return 200 the rest of the gate is meaningless — the
input is not actually a valid signed payload. Re-capture or
re-synthesize before continuing.

> Note: the baseline call burns the `requestNonce` (Requirement 9.7).
> For every subsequent step generate a fresh `requestNonce` (re-sign if
> using Option B) so the verifier reaches the signature check rather
> than short-circuiting on `Nonce already used`.

### 4.1 Mutation A — flip one byte in `payload`

Take `valid.json`, flip the first base64 character of `payload` (e.g. `A` → `B`,
or any character from `[A-Za-z0-9+/]` to a different one in the same
alphabet so it stays valid base64), keep `signature` unchanged, save as
`forged-payload.json`.

```bash
jq '.payload = ((.payload | .[0:1] | sub("A"; "B") | sub("a"; "b") | sub("0"; "1")) + (.payload | .[1:]))' \
  valid.json > forged-payload.json
# then refresh requestNonce so we don't trip 9.7
jq --arg n "manual-c-payload-mut-$(date +%s)" '.requestNonce = $n' \
  forged-payload.json > forged-payload.tmp && mv forged-payload.tmp forged-payload.json

curl -i -X POST http://localhost:8080/auth/supabase/oauth/truecaller \
  -H "Content-Type: application/json" \
  -d @forged-payload.json
```

Expected:

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"success":false,"message":"Invalid signature"}
```

### 4.2 Mutation B — flip one byte in `signature`

Restore `signature` to garbage (flip one base64 char) but keep `payload`
intact:

```bash
jq '.signature = ((.signature | .[0:1] | sub("A"; "B") | sub("a"; "b") | sub("0"; "1")) + (.signature | .[1:]))' \
  valid.json > forged-signature.json
jq --arg n "manual-c-sig-mut-$(date +%s)" '.requestNonce = $n' \
  forged-signature.json > forged-signature.tmp && mv forged-signature.tmp forged-signature.json

curl -i -X POST http://localhost:8080/auth/supabase/oauth/truecaller \
  -H "Content-Type: application/json" \
  -d @forged-signature.json
```

Expected: same HTTP 401 with `{"success":false,"message":"Invalid signature"}`.

### 4.3 Mutation C — flip one byte in `requestNonce` (defence-in-depth)

> Gate C is specifically about the signature/payload mutation paths
> (Requirement 9.3). This step exists to confirm a different mutation is
> rejected with a different — but still 401 — response. It does NOT
> count toward the Gate C pass criteria; it is a sanity check that
> Requirements 9.3 and 9.5 are wired distinctly.

Mutate the body's `requestNonce` so it no longer matches the nonce
embedded inside `payload`:

```bash
jq '.requestNonce = "totally-different-nonce-' "$(date +%s)" '"' \
  valid.json > forged-nonce.json

curl -i -X POST http://localhost:8080/auth/supabase/oauth/truecaller \
  -H "Content-Type: application/json" \
  -d @forged-nonce.json
```

Expected: HTTP 401 with body
`{"success":false,"message":"Nonce mismatch"}`. Acceptable — the request
was rejected. The body differs from Gate C's required message because
this is Requirement 9.5, not 9.3.

## 5. Pass Criteria

Gate C passes only if **all** of the following hold for steps 4.1 and
4.2:

- [ ] HTTP status is exactly `401`.
- [ ] Response body is exactly `{"success":false,"message":"Invalid signature"}`
      (no extra fields, no different message).
- [ ] No Supabase session is issued — response carries no `session` or
      `access_token`.
- [ ] Backend logs do NOT contain the raw `payload`, raw `signature`, or
      full `phoneNumber` (Requirement 13.2 spot-check). Phone numbers
      that do appear must be masked to the last 4 digits.

Step 4.3 must return 401 with `Nonce mismatch`. If it returns
`Invalid signature` instead, the controller is dispatching mutations in
the wrong order — file a bug.

## 6. Fail Troubleshooting

| Observed | Likely cause | Action |
| --- | --- | --- |
| HTTP 200 on a mutated payload | Public-key cache holds a stale dev key that still validates the forgery; or the original `signature` was kept and accidentally still matches the unmutated `payload`; or the tester re-used a fixture where `signature` was regenerated for the mutated payload. | Restart backend (clears in-memory cache), re-capture or re-synthesize, confirm step 4.0 returns 200 first, and verify only one of `payload` / `signature` was changed. |
| HTTP 500 | Verifier threw an unhandled error instead of `UnauthorizedException`. | File a bug. The verifier MUST translate verification failures to 401, never 500. Check `truecaller.service.ts` `verifySignedPayload` for any thrown `Error` outside the catch blocks. |
| HTTP 401 with body `{"success":false,"message":"Invalid request"}` | Body failed DTO validation (`TruecallerInvalidRequestFilter`) before reaching the verifier — usually a missing field after editing JSON. | Re-check the JSON body has all of `payload`, `signature`, `signatureAlgorithm`, `requestNonce`. |
| HTTP 401 with body `{"success":false,"message":"Nonce already used"}` | Same `requestNonce` was used by a previous successful call (often the 4.0 baseline). | Generate a fresh `requestNonce` (and re-sign if using Option B) before each mutation step. |
| HTTP 401 with a different message ("Authentication failed", generic Nest body, etc.) | Verifier wired to a generic exception. | Wire the exact Requirement 9.3 message: `throw new UnauthorizedException({ success: false, message: 'Invalid signature' })`. |
| HTTP 401 with body `{"success":false,"message":"Public key fetch failed"}` | Backend could not reach `https://api4.truecaller.com/v1/key`. | Restore network or, for Option B, point `TRUECALLER_KEYS_API_URL` at a reachable fixture. This failure is distinct from Requirement 9.3 by design (see service docstring) and means Gate C cannot be evaluated yet. |

## 7. Evidence to Capture

Attach to the sign-off:

1. `curl -i` output for step 4.0 (baseline 200) — proves the input was
   genuinely valid.
2. `curl -i` output for step 4.1 (payload byte flip → 401).
3. `curl -i` output for step 4.2 (signature byte flip → 401).
4. `curl -i` output for step 4.3 (nonce flip → 401 with different
   message).
5. Console / file copy of the Jest output from Section 2.
6. The first 200 lines of the backend log emitted during steps 4.0–4.3,
   with the entire log searched for the literal `payload` and
   `signature` field values to confirm they do not appear (Requirement
   13.2).

Redact any real `access_token`, `refresh_token`, full phone numbers, or
`payload`/`signature` strings before checking evidence into the repo or
sharing externally.

## 8. Sign-off

| Field | Value |
| --- | --- |
| Date | _YYYY-MM-DD_ |
| Tester | _name / handle_ |
| Backend commit SHA | `git rev-parse HEAD` from `backend/` at test time |
| Backend URL | `http://localhost:8080` (or staging URL) |
| Automated tests result | _pass / fail — paste Jest summary line_ |
| Manual step 4.1 result | _pass / fail_ |
| Manual step 4.2 result | _pass / fail_ |
| Manual step 4.3 result (defence-in-depth) | _pass / fail_ |
| Notes | _anything unusual_ |

Gate C is **passed** only when steps 4.1 and 4.2 both produced
HTTP 401 with the exact `Invalid signature` body and the automated
tests in Section 2 are green on the same backend commit.
