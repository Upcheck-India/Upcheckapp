// docs/UI_UX_AUDIT.md Tier 1 #3 — "More" previously listed "My Farms" and
// "Reports" as menu entries that duplicated the always-visible Farms/Reports
// bottom tabs. This locks in that the duplicates are gone while the entries
// with no bottom-tab equivalent (Inventory, Calculators, etc.) remain.
import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MoreScreen } from '../MoreScreen';

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { navigate: jest.fn() };
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <MoreScreen navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('MoreScreen — no duplicate bottom-tab entries', () => {
    it('does not list "My Farms" or "Reports" (both duplicate bottom tabs)', () => {
        const { queryByText } = renderScreen();

        expect(queryByText('My Farms')).toBeNull();
        expect(queryByText('Reports')).toBeNull();
    });

    it('still lists entries that have no bottom-tab equivalent', () => {
        const { getByText } = renderScreen();

        expect(getByText('Inventory')).toBeTruthy();
        expect(getByText('Calculators')).toBeTruthy();
        expect(getByText('Settings')).toBeTruthy();
        expect(getByText('Help & Support')).toBeTruthy();
    });
});
