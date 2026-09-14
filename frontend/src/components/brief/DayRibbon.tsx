/**
 * The Day Ribbon — "The day, hour by hour", the page's one bold visual.
 *
 * Four labelled lanes (Water · Feed · Alerts & deaths · Other) across 24 hour
 * columns, midnight to midnight IST. Lane labels stay pinned on the left; the
 * hours scroll sideways, each column at least 44 px so a thumb can hit it.
 * Every lane mark has its own shape (dot, bar, diamond, square) and shows a
 * count when several entries share the hour, so nothing is told by colour
 * alone. 02:00–06:00 is shaded and labelled as the low-oxygen hours. On today
 * a "now" line marks the present and the hours ahead are faded.
 *
 * Placement is by IST hour (features/dailyBriefText#istHour), never the phone's
 * zone. Tap an hour to list what happened in it, with who logged it.
 */
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { Severity, TimelineEvent, TimelineKind } from '../../api/dailyBrief';
import { istHour, istTime } from '../../features/dailyBriefText';
import { SEVERITY_MARK, c } from './Section';

export const COL_W = 44;
const LANE_H = 34;
const HEAD_H = 18;
const AXIS_H = 20;
const LABEL_W = 76;

type Lane = 'water' | 'feed' | 'alert' | 'other';
const LANES: { lane: Lane; label: string }[] = [
    { lane: 'water', label: 'dailyBrief.ribbon.legendWater' },
    { lane: 'feed', label: 'dailyBrief.ribbon.legendFeed' },
    { lane: 'alert', label: 'dailyBrief.ribbon.legendAlert' },
    { lane: 'other', label: 'dailyBrief.ribbon.legendOther' },
];
const laneOf = (k: TimelineKind): Lane =>
    k === 'water' ? 'water' : k === 'feed' || k === 'tray' ? 'feed' : k === 'alert' || k === 'mortality' ? 'alert' : 'other';

const worst = (evs: TimelineEvent[]): Severity | undefined =>
    evs.some((e) => e.severity === 'critical') ? 'critical' : evs.some((e) => e.severity === 'watch') ? 'watch' : undefined;

export const hourOf = (e: TimelineEvent): number => Math.min(23, Math.floor(istHour(e.at)));
const hh = (h: number) => String(h).padStart(2, '0');

const Mark: React.FC<{ lane: Lane; evs: TimelineEvent[]; testID: string }> = ({ lane, evs, testID }) => {
    const sev = worst(evs);
    const hollow = evs.every((e) => e.allDay);
    const shape =
        lane === 'water'
            ? [styles.dot, { backgroundColor: sev ? SEVERITY_MARK[sev] : c.successBorder }]
            : lane === 'feed'
              ? [styles.bar, { backgroundColor: c.textPrimary }]
              : lane === 'alert'
                ? [styles.diamond, { backgroundColor: sev ? SEVERITY_MARK[sev] : c.warningBorder }]
                : [styles.square, { backgroundColor: c.textTertiary }];
    return (
        <View style={styles.markWrap} testID={testID}>
            <View style={[shape, hollow && styles.hollow]} />
            {evs.length > 1 && <Text style={styles.count}>{evs.length}</Text>}
        </View>
    );
};

export const DayRibbon: React.FC<{
    events: TimelineEvent[];
    isToday: boolean;
    now?: Date;
    pondNames: Record<string, string>;
}> = ({ events, isToday, now = new Date(), pondNames }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number | null>(null);
    const scroller = useRef<ScrollView>(null);

    const byHour = useMemo(() => {
        const m: TimelineEvent[][] = Array.from({ length: 24 }, () => []);
        for (const e of events) m[hourOf(e)].push(e);
        return m;
    }, [events]);

    const nowH = isToday ? istHour(now) : null;
    // Open on the part of the day that matters: a few hours before now, or the first entry.
    const focus = nowH ?? (events.length ? Math.min(...events.map(hourOf)) : 0);
    const onLayout = () => scroller.current?.scrollTo?.({ x: Math.max(0, (Math.floor(focus) - 4) * COL_W), animated: false });

    const list = selected == null ? [] : [...byHour[selected]].sort((a, b) => a.at.localeCompare(b.at));
    const gridH = HEAD_H + LANE_H * LANES.length + AXIS_H;

    return (
        <View style={styles.wrap}>
            <Text style={styles.title} accessibilityRole="header">{t('dailyBrief.ribbon.title')}</Text>
            <View style={styles.stage} accessibilityLabel={t('dailyBrief.ribbon.a11y')} testID="day-ribbon">
                <View style={[styles.labels, { height: gridH }]}>
                    <View style={{ height: HEAD_H }} />
                    {LANES.map((l) => (
                        <View key={l.lane} style={styles.laneLabel} testID={`ribbon-lane-${l.lane}`}>
                            <Text style={styles.laneText} numberOfLines={2}>{t(l.label)}</Text>
                        </View>
                    ))}
                </View>
                <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} onLayout={onLayout}>
                    <View style={{ width: COL_W * 24, height: gridH }}>
                        {/* Pre-dawn low-oxygen hours, labelled. */}
                        <View style={[styles.predawn, { left: COL_W * 2, width: COL_W * 4, height: gridH - AXIS_H }]} testID="ribbon-predawn">
                            <Text style={styles.predawnText} numberOfLines={1}>{t('dailyBrief.ribbon.legendPreDawn')}</Text>
                        </View>
                        {LANES.map((l, i) => (
                            <View key={l.lane} style={[styles.laneLine, { top: HEAD_H + LANE_H * i + LANE_H / 2 }]} />
                        ))}
                        <View style={styles.cols}>
                            {byHour.map((evs, h) => {
                                const time = `${hh(h)}:00`;
                                return (
                                    <Pressable
                                        key={h}
                                        style={[styles.col, selected === h && styles.colSelected]}
                                        onPress={() => setSelected((s) => (s === h ? null : h))}
                                        accessible={evs.length > 0}
                                        importantForAccessibility={evs.length > 0 ? 'yes' : 'no-hide-descendants'}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: selected === h }}
                                        accessibilityLabel={
                                            evs.length
                                                ? `${t('dailyBrief.ribbon.hourA11y', { time, count: evs.length })}: ${[...new Set(evs.map((e) => t(`dailyBrief.kinds.${e.kind}`)))].join(', ')}`
                                                : undefined
                                        }
                                        testID={`ribbon-hour-${h}`}
                                    >
                                        <View style={{ height: HEAD_H }} />
                                        {LANES.map((l) => {
                                            const inLane = evs.filter((e) => laneOf(e.kind) === l.lane);
                                            return (
                                                <View key={l.lane} style={styles.cell}>
                                                    {inLane.length > 0 && <Mark lane={l.lane} evs={inLane} testID={`ribbon-mark-${l.lane}-${h}`} />}
                                                </View>
                                            );
                                        })}
                                        <View style={styles.axis} />
                                    </Pressable>
                                );
                            })}
                        </View>
                        {/* Hour ticks every 3 h, outside the touch columns so they are never hidden with an empty hour. */}
                        <View style={[styles.axisRow, { top: gridH - AXIS_H }]} pointerEvents="none">
                            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                                <Text key={h} style={[styles.axisText, { left: h * COL_W }]}>{hh(h)}</Text>
                            ))}
                        </View>
                        {nowH != null && (
                            <>
                                <View style={[styles.future, { left: nowH * COL_W, height: gridH - AXIS_H }]} pointerEvents="none" />
                                <View style={[styles.nowLine, { left: nowH * COL_W - 1, height: gridH - AXIS_H + 4 }]} pointerEvents="none" testID="ribbon-now">
                                    <Text style={styles.nowText}>{t('dailyBrief.ribbon.now')}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>

            {selected == null ? (
                events.length > 0 && <Text style={styles.hint}>{t('dailyBrief.ribbon.hint')}</Text>
            ) : (
                <View style={styles.list} testID="ribbon-hour-list">
                    <View style={styles.listHead}>
                        <Text style={styles.listTitle}>{t('dailyBrief.ribbon.hourTitle', { time: `${hh(selected)}:00` })}</Text>
                        <Pressable onPress={() => setSelected(null)} accessibilityRole="button" style={styles.close}>
                            <Text style={styles.closeText}>{t('dailyBrief.ribbon.close')}</Text>
                        </Pressable>
                    </View>
                    {list.length === 0 ? (
                        <Text style={styles.hint}>{t('dailyBrief.ribbon.nothingThisHour')}</Text>
                    ) : (
                        list.map((e, i) => (
                            <View key={i} style={styles.item}>
                                <Text style={styles.itemTime}>{e.allDay ? t('dailyBrief.ribbon.allDay') : istTime(e.at)}</Text>
                                <View style={styles.itemBody}>
                                    <Text style={styles.itemKind}>
                                        {t(`dailyBrief.kinds.${e.kind}`)}
                                        {e.pondId && pondNames[e.pondId] ? <Text style={styles.itemPond}>{`  ${pondNames[e.pondId]}`}</Text> : null}
                                    </Text>
                                    {!!e.summary && <Text style={styles.itemSummary}>{e.summary}</Text>}
                                    {!!e.actorName && <Text style={styles.itemBy}>{t('dailyBrief.story.by', { name: e.actorName })}</Text>}
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[4], paddingBottom: theme.spacing[5] },
    title: { ...theme.typeScale.h3, color: c.textPrimary, marginBottom: theme.spacing[2] },
    stage: { flexDirection: 'row', backgroundColor: c.surfaceVariant, borderRadius: theme.radius.md, overflow: 'hidden' },
    labels: { width: LABEL_W, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c.borderStrong, paddingLeft: theme.spacing[2] },
    laneLabel: { height: LANE_H, justifyContent: 'center' },
    laneText: { fontSize: 11, lineHeight: 13, fontFamily: 'DMSans-Medium', color: c.textSecondary },
    predawn: { position: 'absolute', top: 0, backgroundColor: c.infoBg, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.infoBorder, paddingHorizontal: 4 },
    predawnText: { fontSize: 10, lineHeight: HEAD_H, fontFamily: 'DMSans-Medium', color: c.infoText },
    laneLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.borderDefault },
    future: { position: 'absolute', top: 0, right: 0, backgroundColor: c.background, opacity: 0.55 },
    nowLine: { position: 'absolute', top: 0, width: 2, backgroundColor: c.primary },
    nowText: { position: 'absolute', top: 1, left: 4, width: 40, fontSize: 10, fontFamily: 'DMSans-SemiBold', color: c.primary },
    cols: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
    col: { width: COL_W, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.borderDefault },
    colSelected: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.primary, borderRadius: 4 },
    cell: { height: LANE_H, alignItems: 'center', justifyContent: 'center' },
    markWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: c.surface },
    bar: { width: 4, height: 18, borderRadius: 2 },
    diamond: { width: 10, height: 10, transform: [{ rotate: '45deg' }] },
    square: { width: 9, height: 9, borderRadius: 1.5 },
    hollow: { opacity: 0.45 },
    count: { fontSize: 11, fontFamily: 'DMMono-Medium', color: c.textPrimary },
    axis: { height: AXIS_H, justifyContent: 'center' },
    axisRow: { position: 'absolute', left: 0, right: 0, height: AXIS_H },
    axisText: { position: 'absolute', top: 3, fontSize: 10, fontFamily: 'DMMono-Regular', color: c.textTertiary, paddingLeft: 3 },
    hint: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[2] },
    list: { marginTop: theme.spacing[3] },
    listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listTitle: { ...theme.typeScale.labelLarge, color: c.textPrimary },
    close: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
    closeText: { ...theme.typeScale.labelLarge, color: c.textLink },
    item: { flexDirection: 'row', gap: theme.spacing[3], paddingVertical: theme.spacing[1.5] },
    itemTime: { ...theme.typeScale.numericSmall, color: c.textSecondary, width: 52 },
    itemBody: { flex: 1, minWidth: 0 },
    itemKind: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    itemPond: { color: c.textTertiary },
    itemSummary: { ...theme.typeScale.numericSmall, color: c.textSecondary },
    itemBy: { ...theme.typeScale.bodySmall, color: c.textTertiary },
});
