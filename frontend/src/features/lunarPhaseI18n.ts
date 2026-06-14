/**
 * Maps a moon-phase name (from either the local moonPhase feature — "Full Moon" —
 * or the backend lunar API — "Full") to a stable i18n key under
 * `engines.lunar.phase_*`, so phase names localise (e.g. Tamil பௌர்ணமி for Full
 * Moon, அமாவாசை for New Moon) when the farmer switches language.
 */
const PHASE_KEY: Record<string, string> = {
    New: 'phase_newMoon',
    'New Moon': 'phase_newMoon',
    'Waxing Crescent': 'phase_waxingCrescent',
    'First Quarter': 'phase_firstQuarter',
    'Waxing Gibbous': 'phase_waxingGibbous',
    Full: 'phase_fullMoon',
    'Full Moon': 'phase_fullMoon',
    'Waning Gibbous': 'phase_waningGibbous',
    'Last Quarter': 'phase_lastQuarter',
    'Waning Crescent': 'phase_waningCrescent',
};

/** Returns the i18n key for a phase name, or null if unrecognised. */
export const lunarPhaseKey = (name?: string | null): string | null =>
    (name && PHASE_KEY[name]) || null;

/**
 * Localise a phase name via the provided `t`. Falls back to the original name
 * if it isn't a recognised phase (defensive — never shows an empty label).
 */
export const localizePhaseName = (
    name: string | null | undefined,
    t: (key: string) => string,
): string => {
    const key = lunarPhaseKey(name);
    return key ? t(`engines.lunar.${key}`) : (name ?? '');
};
