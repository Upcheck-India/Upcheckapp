import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: jest.fn() }),
}));
jest.mock('../../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));

import { withFlag } from '../FeatureGate';
import { useRemoteFlagsStore, clearRemoteFlags } from '../../features/remoteFlags';

const Screen = () => <Text>real screen</Text>;

describe('withFlag route guard', () => {
    beforeEach(() => clearRemoteFlags());

    it('renders the screen by default, the unavailable state when the flag is off', () => {
        const Guarded = withFlag('shop', Screen);
        const r = render(<Guarded />);
        expect(r.getByText('real screen')).toBeTruthy();

        act(() => useRemoteFlagsStore.getState().set({ flags: { 'app-shop': false }, payloads: {} }));
        expect(r.queryByText('real screen')).toBeNull();
        expect(r.getByTestId('feature-unavailable')).toBeTruthy();
        fireEvent.press(r.getByText('Back'));
        expect(mockGoBack).toHaveBeenCalled();
    });

    it('returns the same component per flag+screen (getComponent runs every render)', () => {
        expect(withFlag('shop', Screen)).toBe(withFlag('shop', Screen));
        expect(withFlag('news', Screen)).not.toBe(withFlag('shop', Screen));
    });
});
