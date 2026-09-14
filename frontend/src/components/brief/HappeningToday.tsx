/** "Happening today" — molt phase, planned harvests, DOC milestones, low stock, attendance. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DailyBrief } from '../../api/dailyBrief';
import { formatDate, formatNumber } from '../../utils/formatDate';
import { localNoon } from '../../features/dailyBriefText';
import { Section, Line, c } from './Section';

export const HappeningToday: React.FC<{ brief: DailyBrief; isPast: boolean; names: Record<string, string> }> = ({
    brief,
    isPast,
    names,
}) => {
    const { t } = useTranslation();
    const h = brief.happening;
    const molt = h.molt && h.molt.phase !== 'inter' ? h.molt : null;
    const empty = !molt && !h.harvestsPlanned.length && !h.milestones.length && !h.lowStock.length && !h.attendance;
    const d = (s: string | null) => (s ? formatDate(localNoon(s)) : '–');

    return (
        <Section title={t(isPast ? 'dailyBrief.blocks.happeningPast' : 'dailyBrief.blocks.happening')} testID="brief-happening">
            {empty && <Line text={t('dailyBrief.happening.nothing')} muted />}
            {molt && (
                <Line
                    text={t(`dailyBrief.happening.moltPhase.${molt.phase}`)}
                    meta={[
                        molt.preStart && molt.postEnd ? t('dailyBrief.happening.moltDates', { start: d(molt.preStart), end: d(molt.postEnd), peak: d(molt.peakDate) }) : null,
                        molt.pondsWithPending > 0 ? t('dailyBrief.happening.moltPonds', { count: molt.pondsWithPending }) : null,
                    ].filter(Boolean).join(' · ') || null}
                    mark={molt.phase === 'peak' ? c.warningBorder : c.infoBorder}
                />
            )}
            {h.harvestsPlanned.map((p) => (
                <Line
                    key={`h${p.pondId}${p.plannedDate}`}
                    text={
                        p.targetWeightKg != null
                            ? t('dailyBrief.happening.harvestTarget', { pond: names[p.pondId] ?? '', kg: formatNumber(Math.round(p.targetWeightKg)) })
                            : t('dailyBrief.happening.harvest', { pond: names[p.pondId] ?? '' })
                    }
                    meta={d(p.plannedDate)}
                    mark={c.infoBorder}
                />
            ))}
            {h.milestones.map((m) => (
                <Line
                    key={`d${m.pondId}${m.kind}`}
                    text={t(`dailyBrief.happening.milestone.${m.kind}`, { pond: names[m.pondId] ?? '', doc: m.doc })}
                    mark={c.infoBorder}
                />
            ))}
            {h.lowStock.map((s) => (
                <Line
                    key={s.itemId}
                    text={t('dailyBrief.happening.lowStock', { name: s.name, quantity: formatNumber(s.quantity), unit: s.unit })}
                    mark={c.warningBorder}
                />
            ))}
            {h.attendance && (
                <Line text={t('dailyBrief.happening.attendance', { present: h.attendance.present, total: h.attendance.total })} mark={c.borderStrong} />
            )}
        </Section>
    );
};
