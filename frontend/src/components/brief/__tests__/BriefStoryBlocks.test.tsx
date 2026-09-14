jest.mock('../../../api/client', () => ({ __esModule: true, default: {} }));

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { DayStory } from '../DayStory';
import { WhatWeDid } from '../WhatWeDid';
import { DayRibbon } from '../DayRibbon';
import { doneFixture, makeBrief, storyItems } from '../../../features/__fixtures__/dailyBrief';
import { pondNameMap } from '../../../features/dailyBriefText';
import type { TimelineEvent } from '../../../api/dailyBrief';

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

describe('DayRibbon', () => {
    const ev = (at: string, kind: TimelineEvent['kind'], over: Partial<TimelineEvent> = {}): TimelineEvent => ({ at, allDay: false, kind, pondId: 'p1', summary: '', ...over });
    const events = [
        ev('2026-09-14T00:35:00Z', 'feed', { summary: '8 kg', actorName: 'Ravi' }),
        ev('2026-09-14T00:50:00Z', 'feed', { summary: '6 kg', actorName: 'Lakshmi' }),
        ev('2026-09-14T01:10:00Z', 'feed', { summary: '7 kg' }),
        ev('2026-09-13T23:00:00Z', 'water', { severity: 'watch', summary: 'DO 3.9', pondId: 'p2' }),
    ];

    it('has labelled lanes, 3-hour tick labels and the low-oxygen band', () => {
        const utils = render(<DayRibbon events={events} isToday={false} pondNames={names} />);
        for (const [lane, label] of [['water', 'Water test'], ['feed', 'Feed'], ['alert', 'Alert or deaths'], ['other', 'Other logs']]) {
            expect(within(utils.getByTestId(`ribbon-lane-${lane}`)).getByText(label)).toBeTruthy();
        }
        ['00', '03', '06', '09', '12', '15', '18', '21'].forEach((h) => expect(utils.getByText(h)).toBeTruthy());
        expect(utils.queryByText('01')).toBeNull();
        expect(within(utils.getByTestId('ribbon-predawn')).getByText('Low-oxygen hours (2–6 am)')).toBeTruthy();
        expect(utils.queryByTestId('ribbon-now')).toBeNull();
    });

    it('counts several entries in the same hour and lane', () => {
        const utils = render(<DayRibbon events={events} isToday={false} pondNames={names} />);
        // 06:05 and 06:20 IST feeds share hour 6; 06:40 too.
        expect(within(utils.getByTestId('ribbon-mark-feed-6')).getByText('3')).toBeTruthy();
        expect(within(utils.getByTestId('ribbon-mark-water-4')).queryByText(/\d/)).toBeNull();
        expect(utils.getByTestId('ribbon-hour-6').props.accessibilityLabel).toBe('06:00, 3 entries: Feed');
    });

    it('tapping an hour lists each entry with time, pond, summary and who', () => {
        const utils = render(<DayRibbon events={events} isToday={false} pondNames={names} />);
        fireEvent.press(utils.getByTestId('ribbon-hour-6'));
        const list = utils.getByTestId('ribbon-hour-list');
        expect(within(list).getByText('06:05')).toBeTruthy();
        expect(within(list).getByText('8 kg')).toBeTruthy();
        expect(within(list).getByText('by Ravi')).toBeTruthy();
        expect(within(list).getByText('by Lakshmi')).toBeTruthy();
        expect(within(list).getAllByText(/Pond 1/).length).toBe(3);
    });

    it('marks now on today', () => {
        const utils = render(<DayRibbon events={events} isToday now={new Date('2026-09-14T10:00:00+05:30')} pondNames={names} />);
        expect(utils.getByTestId('ribbon-now')).toBeTruthy();
    });
});
