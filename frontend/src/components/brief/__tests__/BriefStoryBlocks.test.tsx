jest.mock('../../../api/client', () => ({ __esModule: true, default: {} }));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { DayStory } from '../DayStory';
import { WhatWeDid } from '../WhatWeDid';
import { doneFixture, makeBrief, storyItems } from '../../../features/__fixtures__/dailyBrief';
import { pondNameMap } from '../../../features/dailyBriefText';

const names = pondNameMap(makeBrief());

describe('DayStory', () => {
    it('renders one sentence per item, resolved and open issues told apart', () => {
        const b = makeBrief({ isToday: false, story: storyItems });
        const utils = render(<DayStory brief={b} />);
        expect(utils.getByText('The day in short')).toBeTruthy();
        expect(utils.getByText('Pond 2 at 05:10: Oxygen fell to 2.8 mg/L (should stay at 3 or above) — back to safe by 07:30')).toBeTruthy();
        expect(utils.getByText('Pond 2 at 08:30: Ammonia was 1.2 mg/L (limit 0.5) — no safe reading after it')).toBeTruthy();
        // Tone is spoken, not only coloured.
        expect(utils.getByTestId('story-issue_resolved').props.accessibilityLabel).toMatch(/^Good: /);
        expect(utils.getByTestId('story-issue_open').props.accessibilityLabel).toMatch(/^Critical: /);
        expect(utils.getByText('by Ravi')).toBeTruthy();
        expect(utils.getAllByTestId(/^story-/)).toHaveLength(storyItems.length);
    });

    it('is hidden when the story is absent (older backend) or empty', () => {
        expect(render(<DayStory brief={makeBrief()} />).queryByTestId('brief-story')).toBeNull();
        expect(render(<DayStory brief={makeBrief({ story: [] })} />).queryByTestId('brief-story')).toBeNull();
    });

    it('D6: a mortality spike offers a health check for that pond', () => {
        const onHealthCheck = jest.fn();
        const b = makeBrief({
            story: [
                { code: 'mortality_spike', tone: 'watch', pondId: 'p1', count: 140 },
                { code: 'treatment_given', tone: 'info', pondId: 'p2', count: 1 },
            ],
        });
        const utils = render(<DayStory brief={b} onHealthCheck={onHealthCheck} />);
        fireEvent.press(utils.getByTestId('story-health-check-p1'));
        expect(onHealthCheck).toHaveBeenCalledWith('p1');
        // Only the spike line gets the button.
        expect(utils.queryByTestId('story-health-check-p2')).toBeNull();
        // No handler (read-only / past day) → the line alone.
        expect(render(<DayStory brief={b} />).queryByTestId('story-health-check-p1')).toBeNull();
    });

    it('D6: no health-check button once one is logged for the spike', () => {
        const b = makeBrief({ story: [{ code: 'mortality_spike', tone: 'watch', pondId: 'p1', count: 140, resolvedAt: '2026-09-22T05:00:00Z' }] });
        expect(render(<DayStory brief={b} onHealthCheck={jest.fn()} />).queryByTestId('story-health-check-p1')).toBeNull();
    });

    it('D6: an ongoing disease reads as one watch line', () => {
        const b = makeBrief({ story: [{ code: 'disease_ongoing', tone: 'watch', pondId: 'p1', title: 'WFD', count: 20 }] });
        const utils = render(<DayStory brief={b} />);
        expect(utils.getByText(`Is WFD in ${names.p1} still going on? Logged 20 days ago.`)).toBeTruthy();
    });
});

describe('WhatWeDid', () => {
    it('lists people, pond work and tasks done with who', () => {
        const utils = render(<WhatWeDid brief={makeBrief({ done: doneFixture })} names={names} />);
        const ravi = utils.getByTestId('done-person-u1');
        expect(within(ravi).getByText('3 water tests · 12.5 kg feed · 2 tasks in 2 ponds')).toBeTruthy();
        expect(within(ravi).getByText('06:10–18:00 · 11 h 50 min')).toBeTruthy();
        expect(within(ravi).getByText('R')).toBeTruthy();
        // No shift for Lakshmi (null) ⇒ no shift line.
        expect(utils.queryByTestId('done-shift-u2')).toBeNull();

        const p1 = utils.getByTestId('done-pond-p1');
        expect(within(p1).getByText('Pond 1')).toBeTruthy();
        expect(within(p1).getByText('2 water tests · 1 sampling · 3 feed rounds · 24 kg · Average 12.4 g')).toBeTruthy();
        expect(within(p1).getByText('Ravi Kumar, Lakshmi')).toBeTruthy();
        expect(within(utils.getByTestId('done-pond-p2')).getByText(/850 kg harvested/)).toBeTruthy();

        expect(within(utils.getByTestId('done-task-d1')).getByText('By Ravi Kumar · 10:30')).toBeTruthy();
    });

    it('collapses after 3 rows', () => {
        const people = Array.from({ length: 5 }, (_, i) => ({ ...doneFixture.people[1], userId: `x${i}`, name: `P${i}` }));
        const utils = render(<WhatWeDid brief={makeBrief({ done: { ...doneFixture, people } })} names={names} />);
        expect(utils.queryByTestId('done-person-x3')).toBeNull();
        fireEvent.press(utils.getByText('Show all (5)'));
        expect(utils.getByTestId('done-person-x4')).toBeTruthy();
    });

    it('is hidden when done is absent (older backend)', () => {
        expect(render(<WhatWeDid brief={makeBrief()} names={names} />).queryByTestId('brief-done')).toBeNull();
    });
});
