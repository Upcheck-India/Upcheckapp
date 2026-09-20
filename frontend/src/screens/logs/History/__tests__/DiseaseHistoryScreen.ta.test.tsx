// A bare `toLocaleDateString()`/`toLocaleTimeString()` call (device locale)
// can throw a RangeError on Hermes for Indian locales and take the whole
// screen down — see src/utils/formatDate.ts's header comment ("what took the
// Simulations screen down in Tamil"). This locks in that a history screen
// renders a record's date without crashing when the app language is Tamil.
jest.mock('../../../../api/diseases', () => ({
    diseaseApi: { getByCrop: jest.fn(), remove: jest.fn() },
}));
// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// useFocusEffect needs a NavigationContainer the plain SafeAreaProvider
// wrapper below doesn't provide.
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, []);
        },
    };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiseaseHistoryScreen } from '../DiseaseHistoryScreen';
import { diseaseApi } from '../../../../api/diseases';

const mockedGetByCrop = diseaseApi.getByCrop as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: { pondId: 'pond-1', cropId: 'crop-1' } };

const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <DiseaseHistoryScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('DiseaseHistoryScreen — Tamil-locale date rendering', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renders a record date without crashing when i18n language is ta', async () => {
        const i18n = require('../../../../i18n').default;
        await i18n.changeLanguage('ta');
        try {
            mockedGetByCrop.mockResolvedValue({
                data: [{
                    id: 'r-1', cropId: 'crop-1', diseaseId: 'disease-1', recordedDate: '2026-06-17T00:00:00.000Z',
                    notes: 'Treated with colistin', bannedSubstanceFlag: 'none', bannedSubstanceMatches: [],
                }],
            });

            const { findByText } = renderScreen();
            expect(await findByText('Treated with colistin')).toBeTruthy();
            // Formatted via formatDate in the ta-IN tag (app language), not a
            // raw device-locale toLocaleDateString() call — Node's full ICU
            // renders this in Tamil script, proving the screen actually went
            // through the safe, app-language-aware helper.
            expect(await findByText('17 ஜூன், 2026')).toBeTruthy();
        } finally {
            await i18n.changeLanguage('en');
        }
    });
});
