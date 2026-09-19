/** Spec addendum (coverage and unwatched ponds): score, carried over and pond rows. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { VerdictScore } from '../VerdictScore';
import { CarriedOver } from '../CarriedOver';
import { PondGlanceList } from '../PondGlanceList';
import { c } from '../Section';
import { pondNameMap } from '../../../features/dailyBriefText';
import { founderBrief, incompleteBrief, makeBrief } from '../../../features/__fixtures__/dailyBrief';

const color = (node: any) => StyleSheet.flatten(node.props.style)?.color;

describe('VerdictScore — incomplete', () => {
    it('shows grey "Incomplete", no band word, no delta, and the coverage line', () => {
        const utils = render(<VerdictScore brief={incompleteBrief()} onExplain={jest.fn()} />);
        expect(utils.getByText('Incomplete')).toBeTruthy();
        expect(utils.queryByText('Good')).toBeNull();
        expect(utils.queryByText(/from the day before/)).toBeNull();
        expect(utils.getByTestId('brief-coverage')).toHaveTextContent('Based on 1 of 3 stocked ponds');
        expect(color(utils.getByTestId('brief-score'))).toBe(c.textTertiary);
    });

    it('a covered day keeps its band and delta, with the coverage as a quiet line', () => {
        const utils = render(<VerdictScore brief={founderBrief()} onExplain={jest.fn()} />);
        expect(utils.getByText('Good')).toBeTruthy();
        expect(utils.getByText('Up 2 from the day before')).toBeTruthy();
        expect(utils.getByTestId('brief-verdict')).toHaveTextContent('P02 needs watching');
        expect(utils.getByTestId('brief-coverage')).toHaveTextContent('Based on 2 of 3 stocked ponds');
    });
});

describe('CarriedOver — unwatched ponds', () => {
    it('lists the stale pond first, critical in danger, watch in warning, with a log button', () => {
        const b = incompleteBrief({
            carriedOver: { ...incompleteBrief().carriedOver, openAlerts: [{ pondId: 'p01', title: 'Low DO', severity: 'watch', source: 'engine' }] },
        });
        const onRoute = jest.fn();
        const utils = render(<CarriedOver brief={b} mode="morning" names={pondNameMap(b)} onRoute={onRoute} />);
        const texts = utils.UNSAFE_getAllByType(require('react-native').Text).map((n: any) => n.props.children).filter((x: unknown) => typeof x === 'string');
        expect(texts.indexOf('IND06 — nothing logged for 7 days')).toBeLessThan(texts.indexOf('Low DO'));
        expect(color(utils.getByText('IND06 — nothing logged for 7 days'))).toBe(c.dangerText);
        expect(color(utils.getByText('P02 — nothing logged for 3 days'))).toBe(c.warningText);

        fireEvent.press(utils.getAllByText('Log now')[0]);
        expect(onRoute).toHaveBeenCalledWith('DailyRoutine', 'ind06');
    });

    it('no water test routes to the water log; a past day has no buttons', () => {
        const b = makeBrief({ carriedOver: { ...makeBrief().carriedOver, stalePonds: [{ pondId: 'p1', daysSinceWater: 2, daysSinceAny: 0, severity: 'watch' }] } });
        const onRoute = jest.fn();
        const utils = render(<CarriedOver brief={b} mode="morning" names={pondNameMap(b)} onRoute={onRoute} />);
        fireEvent.press(utils.getByText('Log now'));
        expect(onRoute).toHaveBeenCalledWith('WaterQualityLog', 'p1');

        const past = render(<CarriedOver brief={b} mode="report" names={pondNameMap(b)} onRoute={onRoute} />);
        expect(past.getByText('Pond 1 — no water test for 2 days')).toBeTruthy();
        expect(past.queryByText('Log now')).toBeNull();
    });

    it('an empty stale list leaves the block as it was', () => {
        const b = makeBrief();
        expect(render(<CarriedOver brief={b} mode="morning" names={pondNameMap(b)} />).getByText('Nothing was left over from the day before.')).toBeTruthy();
    });
});

describe('PondGlanceList — stale logs on a pond row', () => {
    it('warns about feed not logged even when the pond scored Good', () => {
        const b = founderBrief();
        const utils = render(<PondGlanceList ponds={b.ponds} isToday onOpen={jest.fn()} onRoutine={jest.fn()} />);
        expect(utils.getByText('Feed not logged for 9 days')).toBeTruthy();
        expect(utils.getByText('No water test for 7 days')).toBeTruthy();
        expect(utils.queryByText(/Feed not logged for 0/)).toBeNull();
    });
});
