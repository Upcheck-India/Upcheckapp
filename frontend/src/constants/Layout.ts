import { Dimensions, Platform } from 'react-native';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

export const Layout = {
    window: {
        width,
        height,
    },
    isSmallDevice: width < 375,

    // Spacing scale (4px base)
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32,
        xxxl: 48,
    },

    // Legacy aliases (keep for backward compat)
    padding: 16,
    margin: 16,

    // Border radius scale
    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 9999,
    },
    borderRadius: 8,

    // Elevation / Shadow presets
    cardElevation: 4,
    shadow: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
        },
        xl: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
        },
    },

    // Touch targets (Apple HIG minimum 44pt)
    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
    minTouchTarget: 44,

    // Header
    headerHeight: Platform.OS === 'ios' ? 44 : 56,
    headerBorderRadius: 24,

    // Tab bar
    tabBarHeight: Platform.OS === 'ios' ? 85 : 65,

    // Modal
    modalRadius: 16,
    modalMargin: 20,
    modalPadding: 24,
};
