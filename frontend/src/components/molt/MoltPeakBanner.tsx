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
 * (Harvest plans: a planned date inside a window means soft shells and a
 * lower price).
 */
export const MoltPeakBanner: React.FC<{ messageKey: string; date?: string | null }> = ({ messageKey, date }) => {
  const { t } = useTranslation();
  const { data: windows } = useMoltWindows();
  const hit = windowContaining(windows, date ?? istDateString(new Date()));
  if (!hit || (!date && hit.phase !== 'peak')) return null;
  const fmt = (d: string) => formatDate(`${d}T12:00:00`);
  return (
    <AlertBanner
      type="warning"
      icon="moon-waning-crescent"
      title={t(date ? 'harvestPlans.moltWindowTitle' : 'logs.moltPeakTitle')}
      message={t(messageKey, {
        date: fmt(addDays(hit.window.peakEnd, 1)),
        start: fmt(hit.window.preStart),
        end: fmt(hit.window.postEnd),
      })}
    />
  );
};
