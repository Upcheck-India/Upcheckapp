// B.6: the manager sheet posts {checkOutAt, reason}; the time can never leave [check-in, now].
jest.mock('../../../api/attendance', () => ({ attendanceApi: { checkOut: jest.fn() } }));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CheckOutSheet } from '../CheckOutSheet';
import { attendanceApi } from '../../../api/attendance';

const NOW = new Date('2026-09-14T13:15:00.000Z'); // 18:45 IST
const record: any = { id: 'r1', farmId: 'f1', userId: 'u1', checkInAt: '2026-09-14T00:35:00.000Z', checkOutAt: null, createdAt: '' }; // 06:05 IST
const FARM = { shiftEndLocal: '18:00', shiftHours: 9 };

const renderSheet = (props: any = {}) => {
    const onClose = jest.fn();
    const onDone = jest.fn();
    const utils = render(
        <CheckOutSheet record={record} farmName="Kovalam East" farm={FARM} personName="Suresh" onClose={onClose} onDone={onDone} now={NOW} {...props} />,
    );
    return { ...utils, onClose, onDone };
};

beforeEach(() => {
    jest.clearAllMocks();
    (attendanceApi.checkOut as jest.Mock).mockResolvedValue({ data: {} });
});

describe('CheckOutSheet', () => {
    it('manager: requires a reason, then posts the shift end time with it', async () => {
        const { getByText, onDone, onClose } = renderSheet();
        expect(getByText('Check out Suresh — Kovalam East')).toBeTruthy();

        fireEvent.press(getByText('Check out'));
        expect(attendanceApi.checkOut).not.toHaveBeenCalled();

        fireEvent.press(getByText(/^Shift end /));
        fireEvent.press(getByText('Left early'));
        fireEvent.press(getByText('Check out'));

        await waitFor(() =>
            expect(attendanceApi.checkOut).toHaveBeenCalledWith('r1', {
                checkOutAt: '2026-09-14T12:30:00.000Z', // 18:00 IST
                reason: 'left_early',
            }),
        );
        expect(onDone).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('the picker clamps to [check-in, now]', async () => {
        const { getByText, getByTestId } = renderSheet();
        fireEvent.press(getByText('Pick time…'));
        fireEvent.press(getByText('Forgot'));

        // Far past the check-in: stops at 06:05 IST and the back buttons disable.
        for (let i = 0; i < 20; i++) fireEvent.press(getByTestId('checkout-step--3600000'));
        expect(getByTestId('checkout-step--3600000').props.accessibilityState).toEqual({ disabled: true });
        fireEvent.press(getByText('Check out'));
        await waitFor(() =>
            expect(attendanceApi.checkOut).toHaveBeenLastCalledWith('r1', { checkOutAt: record.checkInAt, reason: 'forgot' }),
        );
    });

    it('the picker cannot go past now', async () => {
        const { getByText, getByTestId } = renderSheet();
        fireEvent.press(getByText('Pick time…'));
        fireEvent.press(getByText('Other'));
        for (let i = 0; i < 5; i++) fireEvent.press(getByTestId('checkout-step-3600000'));
        expect(getByTestId('checkout-step-3600000').props.accessibilityState).toEqual({ disabled: true });
        fireEvent.press(getByText('Check out'));
        await waitFor(() =>
            expect(attendanceApi.checkOut).toHaveBeenLastCalledWith('r1', { checkOutAt: NOW.toISOString(), reason: 'other' }),
        );
    });

    it('own forgotten shift: no reason sent, defaults to the expected end', async () => {
        const { getByText } = renderSheet({ personName: undefined });
        expect(getByText('Check out of Kovalam East?')).toBeTruthy();
        fireEvent.press(getByText('Check out'));
        await waitFor(() =>
            expect(attendanceApi.checkOut).toHaveBeenCalledWith('r1', { checkOutAt: '2026-09-14T12:30:00.000Z' }),
        );
    });

    it('shows the server error instead of closing', async () => {
        (attendanceApi.checkOut as jest.Mock).mockRejectedValue({ response: { status: 400, data: { message: 'checkOutAt before checkInAt' } } });
        const { getByText, findByText, onClose } = renderSheet({ personName: undefined });
        fireEvent.press(getByText('Check out'));
        expect(await findByText('checkOutAt before checkInAt')).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();
    });
});
