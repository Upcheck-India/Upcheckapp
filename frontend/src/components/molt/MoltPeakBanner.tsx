import React from 'react';
import { useTranslation } from 'react-i18next';

import { AlertBanner } from '../ui/AlertBanner';
import { formatDate } from '../../utils/formatDate';
import { addDays, istDateString, windowContaining } from '../../features/moltWindow';
import { useAppQuery } from '../../query/hooks';
import { moltApi } from '../../api/molt';

/** Upcoming molt windows; the dates only change once a fortnight. */
export const useMoltWindows = () =>
  useAppQuery({
    queryKey: ['moltWindows'],
    queryFn: () => moltApi.windows(3).then((r) => r.data),
    staleTime: 6 * 60 * 60 * 1000,
  });

/**
 * Warn-only molt banner (owner decision: never block a save).
 *
 * `peak` shows it only during the molt peak (Sampling / Harvest / Treatment
 * logs). `date` checks an arbitrary day against every window instead
 * (Harvest plans: a planned peak/post day means soft shells and a lower
 * price; pre-molt shells are still hard, so pre days don't warn).
 */
export const MoltPeakBanner: React.FC<{ messageKey: string; date?: string | null }> = ({ messageKey, date }) => {
  const { t } = useTranslation();
  const { data: windows } = useMoltWindows();
  const hit = windowContaining(windows, date ?? istDateString(new Date()));
  if (!hit || hit.phase === 'pre' || (!date && hit.phase !== 'peak')) return null;
  const fmt = (d: string) => formatDate(`${d}T12:00:00`);
  // A planned date reads its phase (M2): "29 Sep is a molt peak day".
  const key = date ? (hit.phase === 'peak' ? 'harvestPlans.moltDayPeak' : 'harvestPlans.moltDayPost') : messageKey;
  return (
    <AlertBanner
      type="warning"
      icon="moon-waning-crescent"
      title={t(date ? 'harvestPlans.moltWindowTitle' : 'logs.moltPeakTitle')}
      message={t(key, {
        date: fmt(date ?? addDays(hit.window.peakEnd, 1)),
        start: fmt(hit.window.preStart),
        end: fmt(hit.window.postEnd),
      })}
    />
  );
};
