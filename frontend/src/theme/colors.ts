// Design System — Color Palette (§2.1)
export const Colors = {
    // Brand
    primary: '#00897B',
    primaryLight: '#4DB6AC',
    primaryDark: '#00695C',

    // Semantic
    success: '#43A047',
    warning: '#FB8C00',
    error: '#E53935',
    info: '#1E88E5',

    // Surface
    background: '#F4F6F8',
    surface: '#FFFFFF',
    surfaceVariant: '#ECEFF1',
    border: '#CFD8DC',
    divider: '#ECEFF1',

    // Text
    textPrimary: '#1A2327',
    textSecondary: '#607D8B',
    textDisabled: '#B0BEC5',
    textInverse: '#FFFFFF',

    // Status chips
    chipActive: '#E8F5E9',
    chipActiveText: '#2E7D32',
    chipIdle: '#ECEFF1',
    chipIdleText: '#455A64',
    chipWarning: '#FFF3E0',
    chipWarningText: '#E65100',
    chipCritical: '#FFEBEE',
    chipCriticalText: '#B71C1C',

    // Status backgrounds
    statusSafeBg: '#E8F5E9',
    statusSafeText: '#2E7D32',
    statusSafeBorder: '#A5D6A7',
    statusWarningBg: '#FFF3E0',
    statusWarningText: '#E65100',
    statusWarningBorder: '#FFCC80',
    statusCriticalBg: '#FFEBEE',
    statusCriticalText: '#B71C1C',
    statusCriticalBorder: '#EF9A9A',
    statusInfoBg: '#E3F2FD',
    statusInfoText: '#1565C0',
    statusInfoBorder: '#90CAF9',
} as const;

export type ColorKey = keyof typeof Colors;
