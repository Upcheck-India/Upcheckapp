import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Stepper } from '../Stepper';

describe('Stepper', () => {
    it('increments and decrements by step', () => {
        const onChange = jest.fn();
        const { getByLabelText } = render(
            <Stepper label="Dead count" value={5} onChange={onChange} step={1} />,
        );
        fireEvent.press(getByLabelText('Increase Dead count'));
        expect(onChange).toHaveBeenCalledWith(6);
        fireEvent.press(getByLabelText('Decrease Dead count'));
        expect(onChange).toHaveBeenCalledWith(4);
    });

    it('does not go below min', () => {
        const onChange = jest.fn();
        const { getByLabelText } = render(
            <Stepper label="Count" value={0} onChange={onChange} min={0} />,
        );
        fireEvent.press(getByLabelText('Decrease Count'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not exceed max', () => {
        const onChange = jest.fn();
        const { getByLabelText } = render(
            <Stepper label="Count" value={10} onChange={onChange} max={10} />,
        );
        fireEvent.press(getByLabelText('Increase Count'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
