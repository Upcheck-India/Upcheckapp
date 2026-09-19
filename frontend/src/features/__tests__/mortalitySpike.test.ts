import { afterMortalitySave, isMortalitySpike, mortality7DayAvg } from '../mortalitySpike';
import { levelFromCount, normaliseSeverity } from '../../api/healthObservations';
import { resizeFor } from '../healthPhoto';

jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' } }));

describe('mortality spike → health-check prompt (D6)', () => {
    const week = ['2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'].map(
        (d, i) => ({ id: `m${i}`, recordDate: d, quantity: 7 }),
    );

    it('7-day average excludes the day itself and the record just saved', () => {
        expect(mortality7DayAvg(week, '2026-09-19')).toBe(7);
        expect(mortality7DayAvg([...week, { id: 'new', recordDate: '2026-09-19', quantity: 80 }], '2026-09-19', 'new')).toBe(7);
        expect(mortality7DayAvg([], '2026-09-19')).toBeNull();
    });

    it('a spike prompts a health check, with the multiple', () => {
        expect(afterMortalitySave({ quantity: 40, avg7: 7, cause: null })).toEqual({ kind: 'health_check', times: 6 });
        expect(afterMortalitySave({ quantity: 12, avg7: null, cause: null })).toEqual({ kind: 'health_check', times: null });
    });

    it('same rule as the backend brief: ≥ 10 and > 3× the average', () => {
        expect(isMortalitySpike(9, null)).toBe(false);
        expect(isMortalitySpike(21, 7)).toBe(false);
        expect(isMortalitySpike(22, 7)).toBe(true);
    });

    it('no spike: cause disease offers a disease record; otherwise nothing', () => {
        expect(afterMortalitySave({ quantity: 8, avg7: 7, cause: 'disease' })).toEqual({ kind: 'disease' });
        expect(afterMortalitySave({ quantity: 8, avg7: 7, cause: 'low_do' })).toBeNull();
        // a spike wins over the cause
        expect(afterMortalitySave({ quantity: 50, avg7: 7, cause: 'disease' })?.kind).toBe('health_check');
    });
});

describe('health helpers', () => {
    it('soft shells in a sample → level (field rule of thumb)', () => {
        expect(levelFromCount(0, 50)).toBe('none');
        expect(levelFromCount(4, 50)).toBe('few');
        expect(levelFromCount(5, 50)).toBe('many');
    });

    it('severity normalisation matches the backend map', () => {
        expect(normaliseSeverity('Mild')).toBe('mild');
        expect(normaliseSeverity('medium')).toBe('moderate');
        expect(normaliseSeverity('HIGH')).toBe('severe');
        expect(normaliseSeverity('x')).toBeNull();
    });

    it('photos resize so the longer side is ≤ 1600 px', () => {
        expect(resizeFor(4000, 3000)).toEqual({ width: 1600 });
        expect(resizeFor(3000, 4000)).toEqual({ height: 1600 });
        expect(resizeFor(1200, 900)).toBeUndefined();
    });
});
