/** What the day started with — "Woke up with" / "Carried over" / "From the day before". */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { DailyBrief } from '../../api/dailyBrief';
import { reasonText, staleLapse, staleSentence, type BriefMode } from '../../features/dailyBriefText';
import { Section, Line, SEVERITY_MARK, HIT, c } from './Section';

const styles = StyleSheet.create({
    seeAll: { minHeight: 32, justifyContent: 'center', paddingLeft: theme.spacing[5], alignSelf: 'flex-start' },
    seeAllText: { ...theme.typeScale.labelLarge, color: c.textLink },
});

const TITLE: Record<BriefMode, string> = {
    morning: 'dailyBrief.blocks.wokeUpWith',
    soFar: 'dailyBrief.blocks.carriedOver',
    wrap: 'dailyBrief.blocks.carriedOver',
    report: 'dailyBrief.blocks.fromDayBefore',
};

export const CarriedOver: React.FC<{
    brief: DailyBrief;
    mode: BriefMode;
    names: Record<string, string>;
    /** Opens a log screen for a pond; omitted (or a past day) ⇒ no buttons. */
    onRoute?: (route: string, pondId: string) => void;
    /** Opens Today's alerts (every alert with its steps); omitted ⇒ no link. */
    onSeeAlerts?: () => void;
}> = ({ brief, mode, names, onRoute, onSeeAlerts }) => {
    const { t } = useTranslation();
    const co = brief.carriedOver;
    const stale = co.stalePonds ?? [];
    const empty = !stale.length && !co.openAlerts.length && !co.overdueTasks.length && !co.worstPrevious && !co.moltPending.length;
    const canLog = !!onRoute && mode !== 'report';

    return (
        <Section title={t(TITLE[mode])} testID="brief-carried">
            {empty && <Line text={t('dailyBrief.carried.nothing')} mark={c.successBorder} muted />}
            {/* Unwatched ponds first: a pond nobody logs must never disappear from the farm view. */}
            {stale.map((s) => (
                <Line
                    key={`s${s.pondId}`}
                    text={staleSentence(s, names, t)}
                    mark={SEVERITY_MARK[s.severity]}
                    tone={s.severity === 'critical' ? 'danger' : 'warning'}
                    actionLabel={canLog ? t('dailyBrief.empty.logNow') : undefined}
                    // No water test ⇒ the water log; nothing at all ⇒ the pond's daily routine, which walks every log.
                    onAction={() => onRoute?.(staleLapse(s).kind === 'water' ? 'WaterQualityLog' : 'DailyRoutine', s.pondId)}
                />
            ))}
            {co.openAlerts.map((a, i) => (
                <Line
                    key={`a${i}`}
                    text={t('dailyBrief.carried.openAlert', { title: a.title })}
                    meta={a.pondId ? names[a.pondId] : brief.farm?.name}
                    mark={SEVERITY_MARK[a.severity]}
                />
            ))}
            {!!onSeeAlerts && mode !== 'report' && co.openAlerts.length > 0 && (
                <TouchableOpacity onPress={onSeeAlerts} hitSlop={HIT} accessibilityRole="button" style={styles.seeAll}>
                    <Text style={styles.seeAllText}>{t('alerts.seeAll')}</Text>
                </TouchableOpacity>
            )}
            {co.worstPrevious && (
                <Line
                    text={t('dailyBrief.carried.worstPrevious', {
                        pond: names[co.worstPrevious.pondId] ?? '',
                        reason: reasonText(co.worstPrevious.reason, t),
                    })}
                    mark={SEVERITY_MARK[co.worstPrevious.reason.severity]}
                />
            )}
            {co.overdueTasks.map((k) => (
                <Line
                    key={k.id}
                    text={t('dailyBrief.carried.overdue', { title: k.title })}
                    meta={[k.pondId ? names[k.pondId] : null, k.assigneeNames.length ? t('dailyBrief.todo.assignedTo', { names: k.assigneeNames.join(', ') }) : null].filter(Boolean).join(' · ') || null}
                    mark={c.warningBorder}
                />
            ))}
            {co.moltPending.map((m) => (
                <Line
                    key={`m${m.pondId}`}
                    text={t('dailyBrief.carried.moltPending', { pond: names[m.pondId] ?? '', count: m.keys.length })}
                    meta={m.keys.map((k) => t(`engines.lunar.item_${k}`)).join(' · ')}
                    mark={c.warningBorder}
                />
            ))}
        </Section>
    );
};
