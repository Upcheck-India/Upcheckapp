/**
 * C0.1 regression guard.
 *
 * Play's July 2026 policy update removed account verification by phone call as
 * a permitted use of READ_CALL_LOG (deadline 14 August 2026). Both permissions
 * were removed — but they live in TWO places, and putting either one back is
 * enough to fail a review:
 *
 *   1. the checked-in android/app/src/main/AndroidManifest.xml, and
 *   2. plugins/withTruecaller.js, which re-injects permissions on every
 *      `expo prebuild`.
 *
 * So this asserts over both files. READ_PHONE_STATE must stay in both:
 * Truecaller one-tap needs it, and deleting it would break sign-in.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..', '..');
const manifest = readFileSync(
    join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8',
);
const plugin = readFileSync(join(root, 'plugins', 'withTruecaller.js'), 'utf8');

/** The plugin's prose explains why the permissions are gone; code is what counts. */
const pluginCode = plugin
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('call-log permissions are gone (C0.1)', () => {
    it.each(['READ_CALL_LOG', 'ANSWER_PHONE_CALLS'])(
        'the checked-in manifest does not declare %s',
        (perm) => {
            expect(manifest).not.toContain(perm);
        },
    );

    it.each(['READ_CALL_LOG', 'ANSWER_PHONE_CALLS'])(
        'the prebuild plugin does not re-add %s',
        (perm) => {
            expect(pluginCode).not.toContain(perm);
        },
    );

    it('keeps READ_PHONE_STATE — one-tap sign-in needs it', () => {
        expect(manifest).toContain('android.permission.READ_PHONE_STATE');
        expect(pluginCode).toContain('android.permission.READ_PHONE_STATE');
    });
});
