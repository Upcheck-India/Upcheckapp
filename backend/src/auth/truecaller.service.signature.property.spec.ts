/**
 * Property-based tests for {@link TruecallerService.verifySignedPayload}.
 *
 * Property 6 (design.md): For any RSA key pair `(pub, priv)` registered in
 * the public-key cache, for any JSON object `D` containing `requestNonce`
 * and a `requestTime` within 600,000 ms of the server clock,
 * `TruecallerService.verifySignedPayload({ ... })` resolves successfully;
 * for any adversarial mutation (signature byte flip, payload byte flip,
 * nonce mismatch, payload expired) the call rejects with an
 * `UnauthorizedException` carrying the exact message from Requirement 9.
 *
 * **Validates: Requirements 9.1, 9.3, 9.4, 9.5, 9.6**
 *
 * Strategy:
 * - Generate one RSA-2048 keypair for the test file (signing is the
 *   expensive part, ~5-10 ms per call; reusing the keypair keeps the
 *   property test under the Jest default timeout while still exercising
 *   the full RSA verify pipeline on every iteration).
 * - Mock `axios.get` so the {@link InMemoryTruecallerKeyCache} returns
 *   the test public key for every key fetch. The cache is per-service-
 *   instance, so building a fresh `TruecallerService` per fc iteration
 *   gives us a fresh nonce store and avoids cross-iteration replay
 *   collisions.
 * - For each fc iteration: build five distinct payloads/nonces and
 *   exercise the iff predicate in one go — the well-formed input must
 *   resolve, and each of the four adversarial mutations must throw
 *   with the exact 9.x message.
 *
 * Note on nonce isolation: `verifySignedPayload` runs the replay-store
 * check before signature verification. Each adversarial branch therefore
 * uses a unique nonce derived from the iteration's base nonce so a prior
 * branch's `markUsed` does not preempt the failure mode under test.
 */

import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fc from 'fast-check';
import axios from 'axios';
import { TruecallerService } from './truecaller.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function publicKeyToBase64Body(publicKey: crypto.KeyObject): string {
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  return pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
}

function buildService(): TruecallerService {
  const config = new ConfigService({});
  return new TruecallerService(config);
}

/** Sign `payload` with `privateKey` using the algorithm dictated by `alg`. */
function signPayload(
  privateKey: crypto.KeyObject,
  alg: 'SHA512withRSA' | 'SHA256withRSA',
  payload: string,
): string {
  const algo = alg.includes('512') ? 'RSA-SHA512' : 'RSA-SHA256';
  const signer = crypto.createSign(algo);
  signer.update(payload);
  return signer.sign(privateKey, 'base64');
}

/**
 * Flip a single character at `index` of `s` to a different base64-safe
 * character. The new character is guaranteed to differ from the original
 * so the mutation is never a no-op.
 */
function mutateAt(s: string, index: number): string {
  if (s.length === 0) return 'A';
  const i = ((index % s.length) + s.length) % s.length;
  const original = s[i];
  const replacement = original === 'A' ? 'B' : 'A';
  return s.slice(0, i) + replacement + s.slice(i + 1);
}

/**
 * Indian mobile number arbitrary matching `^\+91[6-9]\d{9}$`. Built from
 * primitives so we don't depend on `fc.stringMatching`'s implementation
 * details.
 */
const phoneArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom('6', '7', '8', '9'),
    fc.array(fc.integer({ min: 0, max: 9 }), {
      minLength: 9,
      maxLength: 9,
    }),
  )
  .map(([head, rest]) => `+91${head}${rest.join('')}`);

describe('property: signature verification', () => {
  // Generate the keypair once for all property runs in this file. RSA-2048
  // key generation is the slowest operation we touch (~50-100 ms); reusing
  // it across runs keeps the property test well under the Jest timeout
  // budget while still exercising verify against many random payloads.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const keyBody = publicKeyToBase64Body(publicKey);

  beforeEach(() => {
    jest.clearAllMocks();
    // Every axios.get returns the test public key. The cache fetches once
    // per service instance, so this mock fires at most once per fc run.
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: [{ keyName: 'tc-prop-key', key: keyBody }],
    } as never);
  });

  it(
    'accepts well-formed payloads and rejects every adversarial mutation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 0, maxLength: 50 }),
            phoneNumber: phoneArb,
            email: fc.emailAddress(),
            // Base nonce for the iteration; each branch suffixes it.
            baseNonce: fc.uuid(),
            // Distinct nonce for the "nonce mismatch" branch's request body.
            wrongNonce: fc.uuid(),
            // requestTime offsets relative to "now". Fresh: < 600_000 ms;
            // expired: > 600_000 ms.
            freshOffsetMs: fc.integer({ min: 0, max: 599_000 }),
            expiredOffsetMs: fc.integer({
              min: 600_001,
              max: 24 * 60 * 60 * 1000,
            }),
            alg: fc.constantFrom(
              'SHA512withRSA' as const,
              'SHA256withRSA' as const,
            ),
            sigMutateIndex: fc.nat({ max: 1024 }),
            payloadMutateIndex: fc.nat({ max: 1024 }),
          }),
          async (params) => {
            const svc = buildService();
            const now = Date.now();

            // Helper: build a base64-encoded JSON profile for a given
            // nonce / requestTime. The other profile fields are fixed
            // per fc iteration so every branch's payload differs only
            // in the field under test.
            const buildPayload = (
              nonce: string,
              requestTime: number,
            ): string => {
              const profile = {
                requestNonce: nonce,
                requestTime,
                firstName: params.firstName,
                lastName: params.lastName,
                phoneNumber: params.phoneNumber,
                email: params.email,
              };
              return Buffer.from(
                JSON.stringify(profile),
                'utf-8',
              ).toString('base64');
            };

            // ────────────── Branch 1: well-formed → resolves ──────────────
            const validNonce = `${params.baseNonce}-valid`;
            const validPayload = buildPayload(
              validNonce,
              now - params.freshOffsetMs,
            );
            const validSignature = signPayload(
              privateKey,
              params.alg,
              validPayload,
            );

            await expect(
              svc.verifySignedPayload({
                payload: validPayload,
                signature: validSignature,
                signatureAlgorithm: params.alg,
                requestNonce: validNonce,
              }),
            ).resolves.toMatchObject({
              phoneNumber: params.phoneNumber,
              firstName: params.firstName,
              email: params.email,
            });

            // ────────────── Branch 2: mutated signature → "Invalid signature" ──
            const sigMutNonce = `${params.baseNonce}-sigmut`;
            const sigMutPayload = buildPayload(
              sigMutNonce,
              now - params.freshOffsetMs,
            );
            const sigMutSignature = signPayload(
              privateKey,
              params.alg,
              sigMutPayload,
            );
            const mutatedSignature = mutateAt(
              sigMutSignature,
              params.sigMutateIndex,
            );

            await expect(
              svc.verifySignedPayload({
                payload: sigMutPayload,
                signature: mutatedSignature,
                signatureAlgorithm: params.alg,
                requestNonce: sigMutNonce,
              }),
            ).rejects.toMatchObject({
              response: { success: false, message: 'Invalid signature' },
              status: 401,
            });
            await expect(
              svc.verifySignedPayload({
                payload: sigMutPayload,
                signature: mutatedSignature,
                signatureAlgorithm: params.alg,
                requestNonce: `${sigMutNonce}-retry`,
              }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            // ────────────── Branch 3: mutated payload → "Invalid signature" ──
            // Sign the original payload, then flip a byte in the payload
            // string before submission. RSA verify reads the modified
            // string, so the signature no longer matches.
            const payMutNonce = `${params.baseNonce}-paymut`;
            const payMutPayload = buildPayload(
              payMutNonce,
              now - params.freshOffsetMs,
            );
            const payMutSignature = signPayload(
              privateKey,
              params.alg,
              payMutPayload,
            );
            const mutatedPayload = mutateAt(
              payMutPayload,
              params.payloadMutateIndex,
            );

            await expect(
              svc.verifySignedPayload({
                payload: mutatedPayload,
                signature: payMutSignature,
                signatureAlgorithm: params.alg,
                requestNonce: payMutNonce,
              }),
            ).rejects.toMatchObject({
              response: { success: false, message: 'Invalid signature' },
              status: 401,
            });

            // ────────────── Branch 4: nonce mismatch → "Nonce mismatch" ──
            // Embed `embeddedNonce` in the payload, but submit with the
            // distinct `wrongNonce` in the request body. Signature verifies
            // (we signed the original payload), the embedded nonce is then
            // compared against the request nonce and they disagree.
            const embeddedNonce = `${params.baseNonce}-embed`;
            const wrongNonceForBody = `${params.wrongNonce}-wrong`;
            // Prerequisite: the two nonces must actually differ. fc.uuid()
            // gives us that with overwhelming probability, but we belt-
            // and-brace here to keep the assertion meaningful.
            fc.pre(embeddedNonce !== wrongNonceForBody);

            const nonceMismatchPayload = buildPayload(
              embeddedNonce,
              now - params.freshOffsetMs,
            );
            const nonceMismatchSignature = signPayload(
              privateKey,
              params.alg,
              nonceMismatchPayload,
            );

            await expect(
              svc.verifySignedPayload({
                payload: nonceMismatchPayload,
                signature: nonceMismatchSignature,
                signatureAlgorithm: params.alg,
                requestNonce: wrongNonceForBody,
              }),
            ).rejects.toMatchObject({
              response: { success: false, message: 'Nonce mismatch' },
              status: 401,
            });

            // ────────────── Branch 5: expired payload → "Payload expired" ──
            // requestTime is more than 600,000 ms in the past; the
            // signature verifies and the embedded nonce matches the
            // request body, so we reach the freshness check and it
            // rejects.
            const expiredNonce = `${params.baseNonce}-expired`;
            const expiredPayload = buildPayload(
              expiredNonce,
              now - params.expiredOffsetMs,
            );
            const expiredSignature = signPayload(
              privateKey,
              params.alg,
              expiredPayload,
            );

            await expect(
              svc.verifySignedPayload({
                payload: expiredPayload,
                signature: expiredSignature,
                signatureAlgorithm: params.alg,
                requestNonce: expiredNonce,
              }),
            ).rejects.toMatchObject({
              response: { success: false, message: 'Payload expired' },
              status: 401,
            });
          },
        ),
        { numRuns: 25 },
      );
    },
    60_000,
  );
});
