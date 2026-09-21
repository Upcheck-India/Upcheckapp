/**
 * The short data notice shown before account creation (spec C2.2), and the
 * one-paragraph notice for the model-training opt-in (spec C3).
 *
 * LEGAL TEXT. English only until a human legal translator supplies each
 * language — no machine translation (owner decision, 2026-09-21). A locale is
 * switched on by adding its entry to the map; until then it falls back to
 * English, and the screen says so. Whatever language actually rendered is the
 * `locale` recorded on the consent row.
 *
 * Kept out of content.ts because scripts/sync-legal-docs.js evaluates that
 * file with its types stripped by regex, and these maps are typed.
 */
import { LEGAL_META, LEGAL_VERSION } from './content';

export interface NoticeSection {
    heading: string;
    text: string;
}

type LocaleMap<T> = { en: T } & Partial<Record<'hi' | 'ta' | 'te' | 'bn' | 'or', T>>;

const DATA_NOTICE: LocaleMap<NoticeSection[]> = {
    en: [
        {
            heading: 'What we collect',
            text:
                'Your name, email or phone number, and profile photo if you add one. The farm records ' +
                'you enter — ponds, cycles, water quality, feeding, health, harvests, money and team ' +
                'attendance — and photos you attach to them. Your farm\'s district, if you give it. ' +
                'Basic device details and crash reports.',
        },
        {
            heading: 'Why',
            text:
                'To create your account, store your records, and run the calculations, reports and ' +
                'alerts you use. Product analytics only if you say yes. Model training only if you ' +
                'switch it on. We never sell your data and carry no ads.',
        },
        {
            heading: 'Who it goes to',
            text:
                'Only the companies that run the service for us: Supabase (sign-in and database), ' +
                'Render (servers), Cloudflare R2 (photos), Sentry (crash reports), PostHog (analytics, ' +
                'only with your consent), Expo (notifications and app updates) and Brevo (email). ' +
                'Google or Truecaller only if you sign in with them. Members of your farm see what ' +
                'their role allows.',
        },
        {
            heading: 'How long',
            text:
                'Your account while it is open; farm records while the farm exists; photos while ' +
                'their record exists; email codes 10 minutes. Deleting your account removes it.',
        },
        {
            heading: 'Your rights',
            text:
                'See, correct, export and delete your data; withdraw consent in Settings (closing ' +
                'your account withdraws it entirely); raise a grievance; nominate someone to act for ' +
                'you. You may also complain to the Data Protection Board of India.',
        },
        {
            heading: 'Contact',
            text:
                `${LEGAL_META.company}, ${LEGAL_META.contactEmail}. The full Privacy Policy, in ` +
                'English, is the authoritative version.',
        },
    ],
};

const ML_TRAINING_NOTICE: LocaleMap<string> = {
    en:
        'If you switch these on, we may use your farm records and, separately, your photos to ' +
        'improve the advice Neerani gives — for example, feed and disease suggestions. We never use ' +
        'your name, phone number or any money figures. Both are off unless you turn them on, and you ' +
        'can switch either off at any time, which stops any future use.',
};

const pick = <T>(map: LocaleMap<T>, locale: string | undefined): { locale: string; value: T } => {
    const lng = (locale ?? 'en').split('-')[0] as keyof LocaleMap<T>;
    const value = map[lng];
    return value ? { locale: lng, value } : { locale: 'en', value: map.en };
};

/** The notice for `locale`, or English while that translation does not exist. */
export const dataNoticeFor = (locale?: string) => {
    const { locale: shown, value } = pick(DATA_NOTICE, locale);
    return { locale: shown, sections: value, version: LEGAL_VERSION };
};

export const mlTrainingNoticeFor = (locale?: string) => {
    const { locale: shown, value } = pick(ML_TRAINING_NOTICE, locale);
    return { locale: shown, text: value };
};
