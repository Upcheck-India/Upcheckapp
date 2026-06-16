import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChipGroup, ChipOption } from '../ChipGroup';

const OPTIONS: ChipOption[] = [
    { value: 'starter', label: 'Starter' },
    { value: 'grower', label: 'Grower' },
    { value: 'finisher', label: 'Finisher' },
];

describe('ChipGroup', () => {
    it('selects a single value', () => {
        const onChange = jest.fn();
        const { getByText } = render(
            <ChipGroup options={OPTIONS} value={null} onChange={onChange} />,
        );
        fireEvent.press(getByText('Grower'));
        expect(onChange).toHaveBeenCalledWith('grower');
    });

    it('deselects when the selected single value is tapped again', () => {
        const onChange = jest.fn();
        const { getByText } = render(
            <ChipGroup options={OPTIONS} value="grower" onChange={onChange} />,
        );
        fireEvent.press(getByText('Grower'));
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it('accumulates values in multiple mode', () => {
        const onChange = jest.fn();
        const { getByText } = render(
            <ChipGroup options={OPTIONS} value={['starter']} onChange={onChange} multiple />,
        );
        fireEvent.press(getByText('Finisher'));
        expect(onChange).toHaveBeenCalledWith(['starter', 'finisher']);
    });
});
