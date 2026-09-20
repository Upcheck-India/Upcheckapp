import i18n from '../../i18n';
import { photoErrorMessage } from '../photoErrors';

describe('photoErrorMessage (P13)', () => {
    const t = i18n.getFixedT('en');

    it('maps a known backend code to localised copy', () => {
        const err = { response: { data: { code: 'IMAGE_TOO_LARGE' } } };
        expect(photoErrorMessage(err, t, 'fallback')).toBe(
            'That photo is too large. Try again — it will be resized automatically.',
        );
    });

    it.each(['UNSUPPORTED_TYPE', 'STORAGE_UNCONFIGURED', 'AVATAR_NOT_MIGRATED'])(
        'maps %s too',
        (code) => {
            const err = { response: { data: { code } } };
            expect(photoErrorMessage(err, t, 'fallback')).not.toBe('fallback');
        },
    );

    it('falls back for an unrecognised code', () => {
        const err = { response: { data: { code: 'SOMETHING_NEW' } } };
        expect(photoErrorMessage(err, t, 'fallback')).toBe('fallback');
    });

    it('falls back when there is no code at all', () => {
        expect(photoErrorMessage(new Error('boom'), t, 'fallback')).toBe('fallback');
    });
});
