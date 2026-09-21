import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * C5.3: `users.totp_secret` at rest.
 *
 * Stored form: `enc:v1:<iv>:<tag>:<ciphertext>` (each base64), AES-256-GCM with
 * TOTP_ENCRYPTION_KEY (32 bytes, base64). TOTP_ENCRYPTION_KEY_PREVIOUS is
 * decrypt-only, for the rotation window. GCM's tag authenticates the row, so a
 * wrong key and a tampered row fail the same way: no secret.
 *
 * Anything without the prefix is a legacy plaintext secret and is returned
 * as-is. No key set = today's behaviour exactly (plaintext in, plaintext out),
 * so a missing env var can never lock anyone out of 2FA.
 */
const PREFIX = 'enc:v1:';

export type KeyState = 'ok' | 'missing' | 'invalid';

function parseKey(b64: string | undefined): Buffer | null {
  if (!b64) return null;
  const key = Buffer.from(b64, 'base64');
  return key.length === 32 ? key : null;
}

const currentKey = () => parseKey(process.env.TOTP_ENCRYPTION_KEY);
const previousKey = () => parseKey(process.env.TOTP_ENCRYPTION_KEY_PREVIOUS);

/** For the startup log. An invalid key is treated as missing (plaintext writes). */
export function totpKeyState(): KeyState {
  if (!process.env.TOTP_ENCRYPTION_KEY) return 'missing';
  return currentKey() ? 'ok' : 'invalid';
}

export const isSealed = (stored: string) => stored.startsWith(PREFIX);

/** Encrypt with the current key; plaintext passthrough when no key is set. */
export function sealTotpSecret(secret: string): string {
  const key = currentKey();
  if (!key) return secret;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function tryDecrypt(stored: string, key: Buffer): string | null {
  const parts = stored.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  const [iv, tag, ct] = parts.map((p) => Buffer.from(p, 'base64'));
  if (iv.length !== 12 || tag.length !== 16) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch {
    return null; // tag mismatch: wrong key or tampered row
  }
}

/**
 * `secret` is null when a sealed value can't be opened with either key (fail
 * closed). `stale` means it should be re-sealed with the current key: it was
 * plaintext, or only the previous key opened it.
 */
export function openTotpSecret(stored: string): { secret: string | null; stale: boolean } {
  const key = currentKey();
  if (!isSealed(stored)) return { secret: stored, stale: !!key };
  if (key) {
    const secret = tryDecrypt(stored, key);
    if (secret !== null) return { secret, stale: false };
  }
  const prev = previousKey();
  const secret = prev ? tryDecrypt(stored, prev) : null;
  return { secret, stale: secret !== null && !!key };
}
