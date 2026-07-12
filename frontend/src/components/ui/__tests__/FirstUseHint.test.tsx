// Contained version of Concept E (contextual, spread-out hints) from
// docs/ONBOARDING_MODULE_PLAN.md Phase 3 — a hint should show exactly once
// per device, ever, then never again, regardless of how many times the
// screen remounts.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirstUseHint } from '../FirstUseHint';

describe('FirstUseHint', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    it('shows the message on first render', async () => {
        const { findByText } = render(<FirstUseHint flagKey="test-hint" message="Try this feature" />);
        expect(await findByText('Try this feature')).toBeTruthy();
    });

    it('dismissing hides it and persists so it never shows again', async () => {
        const { findByText, getByLabelText, queryByText } = render(
            <FirstUseHint flagKey="test-hint" message="Try this feature" />,
        );
        await findByText('Try this feature');

        fireEvent.press(getByLabelText('Dismiss'));

        await waitFor(() => expect(queryByText('Try this feature')).toBeNull());
        expect(await AsyncStorage.getItem('@upcheck:hint:test-hint')).toBe('1');
    });

    it('never renders if the flag is already set (e.g. a remount after dismissal)', async () => {
        await AsyncStorage.setItem('@upcheck:hint:test-hint', '1');

        const { queryByText } = render(<FirstUseHint flagKey="test-hint" message="Try this feature" />);
        await waitFor(() => {}); // let the AsyncStorage check resolve

        expect(queryByText('Try this feature')).toBeNull();
    });

    it('different flagKeys are independent — dismissing one does not hide another', async () => {
        await AsyncStorage.setItem('@upcheck:hint:hint-a', '1');

        const { findByText } = render(<FirstUseHint flagKey="hint-b" message="A different hint" />);
        expect(await findByText('A different hint')).toBeTruthy();
    });
});
