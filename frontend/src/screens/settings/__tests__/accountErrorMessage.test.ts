jest.mock('../../../lib/supabase', () => ({ supabase: {} }));

import en from '../../../i18n/locales/en';
import { accountErrorMessage } from '../AccountScreen';

// Minimal t(): resolves a dotted key against English, echoing unknown keys
// back the way i18next does.
const t = ((key: string) =>
    key.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), en) ?? key) as any;

const httpError = (data: unknown) => ({ response: { status: 400, data } });

describe('accountErrorMessage', () => {
    it('translates a known backend code', () => {
        expect(accountErrorMessage(httpError({ code: 'CODE_INVALID', message: 'raw' }), t)).toBe(
            en.settings.account.errors.CODE_INVALID,
        );
    });

    it('has a translation for every code the backend can send', () => {
        const codes = [
            'CODE_INVALID', 'CODE_EXPIRED', 'TOO_MANY_ATTEMPTS', 'CODE_COOLDOWN', 'EMAIL_TAKEN',
            'EMAIL_INVALID', 'EMAIL_UNCHANGED', 'NO_REAL_EMAIL', 'PASSWORD_ALREADY_SET',
            'GOOGLE_EMAIL_LOCKED', 'CURRENT_PASSWORD_REQUIRED', 'CURRENT_PASSWORD_INVALID',
            'WEAK_PASSWORD', 'EMAIL_SEND_FAILED', 'MANUAL_LINKING_DISABLED', 'GOOGLE_ALREADY_LINKED',
            'SESSION_EXPIRED', 'GOOGLE_LINK_FAILED',
        ];
        for (const code of codes) {
            expect(accountErrorMessage(httpError({ code }), t)).toBe((en.settings.account.errors as any)[code]);
        }
    });

    it('falls back to the server message for an unknown code, then to generic', () => {
        expect(accountErrorMessage(httpError({ code: 'NEW_THING', message: 'Server says' }), t)).toBe('Server says');
        expect(accountErrorMessage(new Error('offline'), t)).toBe(en.settings.account.errors.generic);
    });
});
