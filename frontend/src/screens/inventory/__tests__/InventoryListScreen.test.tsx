// Regression test for the historically dead "Add Item" button (audit rows
// #29/#86): the FAB + empty-state action used to only fire a no-op
// `Alert.alert()` stub. This locks in that it now opens a real form and
// actually persists a new item via inventoryApi.create — the single fastest
// way a farmer concludes "this app is fake" is tapping a terminal action
// button and having nothing happen.
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        // Run the focus effect immediately/synchronously, same as when a
        // screen is focused on mount — the real hook needs a NavigationContainer.
        useFocusEffect: (effect: () => void) => {
            const React = require('react');
            React.useEffect(effect, []);
        },
    };
});
jest.mock('../../../api/inventory', () => ({
    inventoryApi: {
        getAll: jest.fn(),
        create: jest.fn(),
    },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// react-native-safe-area-context's real `initialWindowMetrics` is statically
// `null` outside a native runtime, so SafeAreaProvider waits forever for an
// onLayout event that react-test-renderer never fires (children stay `null`,
// with no thrown error). Supply fake metrics so it renders immediately.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
import { InventoryListScreen } from '../InventoryListScreen';
import { inventoryApi } from '../../../api/inventory';
import { useActiveFarmStore } from '../../../store/activeFarmStore';

const mockedGetAll = inventoryApi.getAll as jest.Mock;
const mockedCreate = inventoryApi.create as jest.Mock;
const navigation = { navigate: jest.fn() };

// ScreenWrapper → OfflineIndicator calls useSafeAreaInsets(), which throws
// without a provider above it in the tree.
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <InventoryListScreen navigation={navigation} />
        </SafeAreaProvider>,
    );

describe('InventoryListScreen — Add Item (regression for the dead-button bug)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetAll.mockResolvedValue({ data: [] });
        useActiveFarmStore.setState({
            selectedFarm: { id: 'farm-1', name: 'Ravi\'s Farm' },
        } as any);
    });

    it('opens a real create form from the FAB and persists a new item (not a stub alert)', async () => {
        mockedCreate.mockResolvedValue({ data: { id: 'item-1' } });

        const { getByLabelText, getByPlaceholderText, getAllByPlaceholderText, getAllByText } = renderScreen();

        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        // Tap the FAB — this used to fire Alert.alert('Coming soon') and do
        // nothing observable. Now it must open the add-item form.
        fireEvent.press(getByLabelText('Add'));

        const nameInput = getByPlaceholderText('e.g. Starter feed');
        fireEvent.changeText(nameInput, 'Starter Feed 40kg');
        // Quantity/reorder-level/unit-price all share the "0" placeholder;
        // the first is quantity.
        fireEvent.changeText(getAllByPlaceholderText('0')[0], '10');

        // "Add Item" also labels the (still-mounted, off-screen) empty-state
        // action and the modal's own title Text — the LAST match is the
        // modal's submit Button, distinct from the FAB that opened it.
        const addItemMatches = getAllByText('Add Item');
        fireEvent.press(addItemMatches[addItemMatches.length - 1]);

        await waitFor(() =>
            expect(mockedCreate).toHaveBeenCalledWith(
                expect.objectContaining({ farmId: 'farm-1', name: 'Starter Feed 40kg' }),
            ),
        );
        // A real create must trigger a real refetch so the new item is visible —
        // not just close the modal and leave stale data on screen.
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(2));
    });

    it('rejects an empty item name client-side without ever calling the API', async () => {
        const { getByLabelText, getAllByText } = renderScreen();
        await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

        fireEvent.press(getByLabelText('Add'));
        const addItemMatches = getAllByText('Add Item');
        fireEvent.press(addItemMatches[addItemMatches.length - 1]);

        await waitFor(() => expect(mockedCreate).not.toHaveBeenCalled());
    });
});
