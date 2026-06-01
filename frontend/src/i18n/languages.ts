// Supported app languages. `label` is the English name; `nativeLabel` is the
// endonym shown in the language picker.
export interface AppLanguage {
    code: string;
    label: string;
    nativeLabel: string;
}

export const LANGUAGES: AppLanguage[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
    { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
    { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
    { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
