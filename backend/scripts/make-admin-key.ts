/**
 * Generates one staff member's admin-dashboard key.
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/make-admin-key.ts "<staff name>"
 *
 * Prints the raw key once (give it to that person directly, never commit it)
 * and the hash line to merge into ADMIN_STAFF_KEYS on Render. See
 * backend/RENDER-SETUP.md for the full rollout.
 */
import { randomBytes, createHash } from 'crypto';

const name = process.argv[2];
if (!name) {
  console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/make-admin-key.ts "<staff name>"');
  process.exit(1);
}

const key = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(key, 'utf8').digest('hex');

console.log(`Key for "${name}" — give this to them now, it is not shown again:\n`);
console.log(`  ${key}\n`);
console.log(`Add this entry to ADMIN_STAFF_KEYS on Render (merge into the existing JSON object):\n`);
console.log(`  "${name}": "${hash}"\n`);
