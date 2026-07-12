// docs/UI_UX_AUDIT.md Tier 2 #9 — every diagnosis match used to render with
// identical visual weight regardless of confidence, so a 12%-confidence
// guess looked as credible as an 80%-confidence one. This locks in that a
// match below the weak-match threshold is visibly labeled, while a strong
// match is not — without hiding the weak one (it may still be a useful lead).
jest.mock('../../../features/diseaseMatch', () => ({
    matchDiseases: jest.fn(),
}));
jest.mock('../../../api/diseases', () => ({
    diseaseApi: { getAllDiseases: jest.fn() },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DiagnoseScreen } from '../DiagnoseScreen';
import { matchDiseases } from '../../../features/diseaseMatch';

const mockedMatch = matchDiseases as jest.Mock;

// See src/screens/inventory/__tests__/InventoryListScreen.test.tsx for why:
// react-native-safe-area-context's initialWindowMetrics is statically null
// outside a native runtime, so SafeAreaProvider needs explicit fake metrics.
const TEST_SAFE_AREA_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = { params: {} };
const renderScreen = () =>
    render(
        <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
            <DiagnoseScreen route={route} navigation={navigation} />
        </SafeAreaProvider>,
    );

// Selecting any real symptom chip is enough to enable the Diagnose button;
// matchDiseases itself is mocked, so the exact symptom picked doesn't matter.
const selectAnySymptomAndRunDiagnosis = (getByText: any, getAllByText: any) => {
    fireEvent.press(getByText('White spots on shell'));
    // "Diagnose" is both the header title and the run button — the button is
    // the last match in tree order.
    const matches = getAllByText('Diagnose');
    fireEvent.press(matches[matches.length - 1]);
};

describe('DiagnoseScreen — weak-match visual distinction', () => {
    beforeEach(() => jest.clearAllMocks());

    it('labels a low-confidence match as "Weak match" but still shows it', () => {
        mockedMatch.mockReturnValue([
            { key: 'a', name: 'Strong Candidate', libraryName: 'a', severity: 'high', score: 9, confidence: 85, matchedSymptoms: [] },
            { key: 'b', name: 'Weak Candidate', libraryName: 'b', severity: 'low', score: 1, confidence: 15, matchedSymptoms: [] },
        ]);

        const { getByText, getAllByText } = renderScreen();
        selectAnySymptomAndRunDiagnosis(getByText, getAllByText);

        expect(getByText('Strong Candidate')).toBeTruthy();
        expect(getByText('Weak Candidate')).toBeTruthy();
        expect(getAllByText('Weak match')).toHaveLength(1); // only the weak one is labeled
    });

    it('does not label a strong match as weak', () => {
        mockedMatch.mockReturnValue([
            { key: 'a', name: 'Strong Candidate', libraryName: 'a', severity: 'high', score: 9, confidence: 85, matchedSymptoms: [] },
        ]);

        const { getByText, getAllByText, queryByText } = renderScreen();
        selectAnySymptomAndRunDiagnosis(getByText, getAllByText);

        expect(getByText('Strong Candidate')).toBeTruthy();
        expect(queryByText('Weak match')).toBeNull();
    });

    it('shows a "no match" state when nothing scores above zero', () => {
        mockedMatch.mockReturnValue([]);

        const { getByText, getAllByText } = renderScreen();
        selectAnySymptomAndRunDiagnosis(getByText, getAllByText);

        expect(getByText('No close match. Consider an expert consultation.')).toBeTruthy();
    });
});
