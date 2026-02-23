import { TextStyle } from 'react-native';

// Design System — Typography (§2.2)
export const typography: Record<string, TextStyle> = {
    // Display
    h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' },
    h4: { fontSize: 16, fontWeight: '600' },

    // Body
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 },

    // Labels
    labelLarge: { fontSize: 14, fontWeight: '600' },
    labelMedium: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },

    // Special
    numericLarge: { fontSize: 32, fontWeight: '700' },
    numericMedium: { fontSize: 20, fontWeight: '600' },
    caption: { fontSize: 11, fontWeight: '400', color: '#607D8B' },
};
