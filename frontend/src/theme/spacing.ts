import { ViewStyle } from 'react-native';

// Design System — Spacing (§2.3)
export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

// Border Radius (§2.4)
export const radius = {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
} as const;

// Elevation / Shadows (§2.5)
export const shadows: Record<string, ViewStyle> = {
    sm: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    md: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    lg: { elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
};
