/**
 * The old `MorningBriefing` route. Renders the Daily Brief, so every old link
 * keeps working — and falls back to the legacy screen while the `dailyBrief`
 * kill switch is off, rather than a dead end.
 */
import React from 'react';
import { useFlag } from '../../features/remoteFlags';
import { DailyBriefScreen } from './DailyBriefScreen';

export const MorningBriefingRoute = (props: any) => {
    if (useFlag('dailyBrief')) return <DailyBriefScreen {...props} />;
    const Legacy = require('../engines/MorningBriefingScreen').MorningBriefingScreen;
    return <Legacy {...props} />;
};
