/**
 * Property-based tests for {@link InMemoryNonceReplayStore} replay protection.
 *
 * Property 7 (design.md): For any signed payload `S` that verifies
 * successfully, calling `verifySignedPayload(S)` twice within the
 * configured nonce TTL produces success on the first call and
 * `UnauthorizedException("Nonce already used")` on the second call.
 *
 * **Validates: Requirements 9.7**
 *
 * Strategy: rather than re-derive the verifier pipeline, exercise the
 * pluggable replay-store seam directly. The {@link TruecallerService}
 * delegates replay-protection decisions to {@link NonceReplayStore.assertUnused}
 * verbatim, so any property that holds for the in-memory store also
 * holds at the verifier surface.
 *
 * Each fast-check run drives a randomized sequence of `markUsed` and
 * `assertUnused` operations against multiple nonces with arbitrary time
 * advances injected via the store's `now: () => number` seam. A simple
 * model — `Map<nonce, expiresAt>` — predicts the outcome of every
 * operation; the property asserts the real store agrees with the model
 * and that rejections carry the exact 9.7 error body.
 */

import { UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import { InMemoryNonceReplayStore } from './truecaller.service';

type Op =
  | { kind: 'markUsed'; nonce: string; advanceMs: number }
  | { kind: 'assertUnused'; nonce: string; advanceMs: number };

function opArb(nonces: readonly string[]): fc.Arbitrary<Op> {
  const nonceArb = fc.constantFrom(...nonces);
  // advanceMs spans both sub-TTL and post-TTL gaps so the sequence covers
  // both replay-rejection and reuse-after-expiry transitions. The upper
  // bound is generous (4× the 600s TTL we use below) to give shrinker
  // room to land on minimal counterexamples.
  const advanceArb = fc.integer({ min: 0, max: 4 * 600_000 });
  return fc.oneof(
    fc.record({
      kind: fc.constant('markUsed' as const),
      nonce: nonceArb,
      advanceMs: advanceArb,
    }),
    fc.record({
      kind: fc.constant('assertUnused' as const),
      nonce: nonceArb,
      advanceMs: advanceArb,
    }),
  );
}

async function expectRejectedWithReplayBody(
  p: Promise<unknown>,
): Promise<void> {
  let threw: unknown = null;
  try {
    await p;
  } catch (e) {
    threw = e;
  }
  if (!(threw instanceof UnauthorizedException)) {
    throw new Error(
      `Expected UnauthorizedException, got ${threw === null ? 'no throw' : String(threw)}`,
    );
  }
  const response = threw.getResponse() as {
    success?: boolean;
    message?: string;
  };
  if (
    response?.success !== false ||
    response?.message !== 'Nonce already used'
  ) {
    throw new Error(
      `Expected response { success: false, message: 'Nonce already used' }, got ${JSON.stringify(response)}`,
    );
  }
  if (threw.getStatus() !== 401) {
    throw new Error(`Expected status 401, got ${threw.getStatus()}`);
  }
}

async function expectResolved(p: Promise<unknown>): Promise<void> {
  // If the promise rejects this throws and fast-check reports it as a
  // counterexample with the rejection embedded.
  await p;
}

describe('InMemoryNonceReplayStore — property-based replay protection', () => {
  const TTL_MS = 600_000; // Requirement 9.7 floor.

  it('matches a Map<nonce, expiresAt> model across random op sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a small alphabet of distinct nonces, then sequences
        // drawn from that alphabet so collisions are common (otherwise
        // the property is trivially true on every step).
        fc
          .uniqueArray(fc.string({ minLength: 1, maxLength: 16 }), {
            minLength: 1,
            maxLength: 5,
          })
          .chain((nonces) =>
            fc.record({
              nonces: fc.constant(nonces),
              ops: fc.array(opArb(nonces), { minLength: 1, maxLength: 50 }),
            }),
          ),
        async ({ ops }) => {
          let now = 1_000_000;
          const store = new InMemoryNonceReplayStore(TTL_MS, () => now);
          // Model: nonce → expiresAt (now + TTL at time of markUsed).
          // A nonce is "live" iff `expiresAt > now`.
          const model = new Map<string, number>();

          for (const op of ops) {
            now += op.advanceMs;

            if (op.kind === 'markUsed') {
              await store.markUsed(op.nonce);
              model.set(op.nonce, now + TTL_MS);
              continue;
            }

            // assertUnused: predict acceptance via the model.
            const expiresAt = model.get(op.nonce);
            const live = expiresAt !== undefined && expiresAt > now;
            if (live) {
              await expectRejectedWithReplayBody(store.assertUnused(op.nonce));
            } else {
              await expectResolved(store.assertUnused(op.nonce));
              if (expiresAt !== undefined && expiresAt <= now) {
                model.delete(op.nonce);
              }
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects a second use within the TTL and accepts reuse after expiry', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        // Replay gap strictly inside the TTL window.
        fc.integer({ min: 0, max: TTL_MS - 1 }),
        // Reuse gap strictly past the TTL window (relative to the
        // original markUsed). +1 ms is enough to step past expiry.
        fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 }),
        async (nonce, replayGapMs, postExpiryGapMs) => {
          let now = 5_000_000;
          const store = new InMemoryNonceReplayStore(TTL_MS, () => now);

          // First use is always accepted.
          await expectResolved(store.assertUnused(nonce));
          await store.markUsed(nonce);

          // Second use within TTL is rejected with the 9.7 body.
          now += replayGapMs;
          await expectRejectedWithReplayBody(store.assertUnused(nonce));

          // After TTL elapses, the same nonce becomes reusable. Step from
          // the original markUsed timestamp to TTL_MS + 1, factoring in
          // the replayGapMs we already advanced.
          now += TTL_MS - replayGapMs + postExpiryGapMs;
          await expectResolved(store.assertUnused(nonce));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('treats distinct nonces as independent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .uniqueArray(fc.string({ minLength: 1, maxLength: 16 }), {
            minLength: 2,
            maxLength: 6,
          })
          .chain((nonces) =>
            fc.record({
              nonces: fc.constant(nonces),
              // Pick which nonce gets marked first.
              markedIndex: fc.integer({ min: 0, max: nonces.length - 1 }),
              // Advance arbitrarily but stay strictly inside the TTL so
              // the marked nonce remains live for the assertion below.
              advanceMs: fc.integer({ min: 0, max: TTL_MS - 1 }),
            }),
          ),
        async ({ nonces, markedIndex, advanceMs }) => {
          let now = 7_000_000;
          const store = new InMemoryNonceReplayStore(TTL_MS, () => now);
          const marked = nonces[markedIndex];
          await store.markUsed(marked);
          now += advanceMs;

          // Every other nonce must still be acceptable; the marked one
          // must be rejected with the 9.7 body.
          for (const n of nonces) {
            if (n === marked) {
              await expectRejectedWithReplayBody(store.assertUnused(n));
            } else {
              await expectResolved(store.assertUnused(n));
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
