/**
 * Lightweight TOTP utility using Node.js built-in crypto.
 * Replaces otplib which has ESM/CJS compatibility issues on Node 18.
 */
import { createHmac, randomBytes } from 'crypto';

// ─── Base32 Encoding/Decoding ──────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
    let bits = '';
    for (const byte of buffer) {
        bits += byte.toString(2).padStart(8, '0');
    }
    let result = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.substring(i, i + 5).padEnd(5, '0');
        result += BASE32_CHARS[parseInt(chunk, 2)];
    }
    return result;
}

function base32Decode(encoded: string): Buffer {
    let bits = '';
    for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
        const idx = BASE32_CHARS.indexOf(char);
        if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
        bits += idx.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}

// ─── HOTP Generation ───────────────────────────────────────────────
function generateHOTP(secret: Buffer, counter: number, digits = 6): string {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    return (code % 10 ** digits).toString().padStart(digits, '0');
}

// ─── TOTP Generation ───────────────────────────────────────────────
function generateTOTP(secret: Buffer, timeStep = 30, digits = 6): string {
    const counter = Math.floor(Date.now() / 1000 / timeStep);
    return generateHOTP(secret, counter, digits);
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Generate a random base32-encoded secret for TOTP.
 */
export function generateSecret(length = 20): string {
    return base32Encode(randomBytes(length));
}

/**
 * Generate an otpauth:// URI for QR code generation.
 */
export function generateOtpAuthURI(options: {
    issuer: string;
    label: string;
    secret: string;
}): string {
    const { issuer, label, secret } = options;
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedLabel = encodeURIComponent(label);
    return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Verify a TOTP token against a base32-encoded secret.
 * Allows a window of ±1 time step to account for clock drift.
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
    const secretBuffer = base32Decode(secret);
    const timeStep = 30;
    const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

    for (let i = -window; i <= window; i++) {
        const expected = generateHOTP(secretBuffer, currentCounter + i);
        if (expected === token) {
            return true;
        }
    }
    return false;
}
