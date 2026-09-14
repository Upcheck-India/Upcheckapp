/**
 * The Day Ribbon — the page's signature element.
 *
 * One 24-hour strip, midnight to midnight IST, in three quiet lanes: feed ticks
 * on top, water tests as dots coloured by their worst zone in the middle,
 * alerts and deaths as triangles (and other logs as small squares) below. The
 * 02:00–06:00 band is shaded — the pre-dawn hours when oxygen crashes — so a
 * farmer sees at a glance whether anyone tested water when it mattered. On
 * today the hours still ahead are veiled and a "now" line marks the present.
 *
 * Placement is by IST hour (features/dailyBriefText#istHour), never the phone's
 * zone. Tap an hour to list what happened in it; every hour with entries is its
 * own accessible button.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Line as SvgLine, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { TimelineEvent } from '../../api/dailyBrief';
import { istHour, istTime } from '../../features/dailyBriefText';
import { SEVERITY_MARK, c } from './Section';

const H = 92;
const TRACK_TOP = 6;
const TRACK_H = 62;
const LANE_FEED = TRACK_TOP + 14;
const LANE_WATER = TRACK_TOP + 31;
const LANE_EVENT = TRACK_TOP + 48;
const AXIS_Y = 86;
const PAD = 4;

const zoneFill = (e: TimelineEvent) =>
    e.severity === 'critical' ? c.dangerBorder : e.severity === 'watch' ? c.warningBorder : c.successBorder;

export const hourOf = (e: TimelineEvent): number => Math.min(23, Math.floor(istHour(e.at)));

export const DayRibbon: React.FC<{
    events: TimelineEvent[];
    isToday: boolean;
    now?: Date;
    pondNames: Record<string, string>;
}> = ({ events, isToday, now = new Date(), pondNames }) => {
    const { t } = useTranslation();
    const [width, setWidth] = useState(320);
    const [selected, setSelected] = useState<number | null>(null);
    const inner = width - PAD * 2;
    const x = (h: number) => PAD + (h / 24) * inner;

    const byHour = useMemo(() => {
        const m: TimelineEvent[][] = Array.from({ length: 24 }, () => []);
        for (const e of events) m[hourOf(e)].push(e);
        return m;
    }, [events]);

    const nowH = isToday ? istHour(now) : null;
    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.max(200, Math.round(e.nativeEvent.layout.width)));

    const mark = (e: TimelineEvent, i: number) => {
        const ex = x(istHour(e.at));
        const hollow = e.allDay;
        switch (e.kind) {
            case 'feed':
            case 'tray':
                return (
                    <SvgLine
                        key={i}
                        x1={ex}
                        x2={ex}
                        y1={LANE_FEED - (e.kind === 'feed' ? 7 : 4)}
                        y2={LANE_FEED + (e.kind === 'feed' ? 7 : 4)}
                        stroke={e.kind === 'feed' ? c.textPrimary : c.textSecondary}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeOpacity={hollow ? 0.5 : 1}
                    />
                );
            case 'water':
                return (
                    <Circle
                        key={i}
                        cx={ex}
                        cy={LANE_WATER}
                        r={5}
                        fill={hollow ? c.surface : zoneFill(e)}
                        stroke={hollow ? zoneFill(e) : c.surface}
                        strokeWidth={1.5}
                    />
                );
            case 'alert':
            case 'mortality': {
                const s = 6;
                const fill = e.severity ? SEVERITY_MARK[e.severity] : c.warningBorder;
                return (
                    <Polygon
                        key={i}
                        points={`${ex},${LANE_EVENT - s} ${ex - s},${LANE_EVENT + s - 1} ${ex + s},${LANE_EVENT + s - 1}`}
                        fill={hollow ? c.surface : fill}
                        stroke={hollow ? fill : c.surface}
                        strokeWidth={1.5}
                    />
                );
            }
            default:
                return (
                    <Rect key={i} x={ex - 3} y={LANE_EVENT - 3} width={6} height={6} rx={1} fill={c.textTertiary} />
                );
        }
    };

    const list = selected == null ? [] : byHour[selected];

    return (
        <View style={styles.wrap}>
            <Text style={styles.title} accessibilityRole="header">{t('dailyBrief.ribbon.title')}</Text>
            <View onLayout={onLayout} style={styles.stage} accessibilityLabel={t('dailyBrief.ribbon.a11y')} testID="day-ribbon">
                <Svg width={width} height={H}>
                    <Rect x={PAD} y={TRACK_TOP} width={inner} height={TRACK_H} rx={10} fill={c.surfaceVariant} />
                    {/* Pre-dawn low-oxygen hours. */}
                    <Rect x={x(2)} y={TRACK_TOP} width={x(6) - x(2)} height={TRACK_H} fill={c.infoBg} testID="ribbon-predawn" />
                    <SvgLine x1={x(2)} x2={x(2)} y1={TRACK_TOP} y2={TRACK_TOP + TRACK_H} stroke={c.infoBorder} strokeOpacity={0.35} strokeDasharray="3,3" />
                    <SvgLine x1={x(6)} x2={x(6)} y1={TRACK_TOP} y2={TRACK_TOP + TRACK_H} stroke={c.infoBorder} strokeOpacity={0.35} strokeDasharray="3,3" />
                    {[6, 12, 18].map((h) => (
                        <SvgLine key={h} x1={x(h)} x2={x(h)} y1={TRACK_TOP + 4} y2={TRACK_TOP + TRACK_H - 4} stroke={c.borderStrong} strokeWidth={StyleSheet.hairlineWidth * 2} />
                    ))}

                    <G>{events.map(mark)}</G>

                    {nowH != null && (
                        <G testID="ribbon-now">
                            <Rect x={x(nowH)} y={TRACK_TOP} width={Math.max(0, x(24) - x(nowH))} height={TRACK_H} fill={c.background} opacity={0.6} />
                            <SvgLine x1={x(nowH)} x2={x(nowH)} y1={TRACK_TOP - 4} y2={TRACK_TOP + TRACK_H + 4} stroke={c.primary} strokeWidth={2} />
                            <Circle cx={x(nowH)} cy={TRACK_TOP - 3} r={3.5} fill={c.primary} />
                        </G>
                    )}
                    {selected != null && (
                        <Rect x={x(selected)} y={TRACK_TOP - 1} width={x(selected + 1) - x(selected)} height={TRACK_H + 2} rx={3} fill="none" stroke={c.primary} strokeWidth={1.5} />
                    )}

                    {[0, 6, 12, 18, 24].map((h) => {
                        const hidden = nowH != null && Math.abs(x(h) - x(nowH)) < 18;
                        return hidden ? null : (
                            <SvgText key={h} x={Math.min(Math.max(x(h), 10), width - 10)} y={AXIS_Y} fontSize={10} fontFamily="DMMono-Regular" fill={c.textTertiary} textAnchor="middle">
                                {String(h).padStart(2, '0')}
                            </SvgText>
                        );
                    })}
                    {nowH != null && (
                        <SvgText x={Math.min(Math.max(x(nowH), 14), width - 14)} y={AXIS_Y} fontSize={10} fontFamily="DMSans-SemiBold" fill={c.primary} textAnchor="middle">
                            {t('dailyBrief.ribbon.now')}
                        </SvgText>
                    )}
                </Svg>

                {/* 24 touch columns over the strip. */}
                <View style={[StyleSheet.absoluteFill, styles.hours, { left: PAD, right: PAD, bottom: H - TRACK_TOP - TRACK_H }]}>
                    {byHour.map((evs, h) => {
                        const time = `${String(h).padStart(2, '0')}:00`;
                        return (
                            <Pressable
                                key={h}
                                style={styles.hour}
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
                            />
                        );
                    })}
                </View>
            </View>

            <View style={styles.legend}>
                <LegendItem label={t('dailyBrief.ribbon.legendFeed')}>
                    <SvgLine x1={6} x2={6} y1={1} y2={11} stroke={c.textPrimary} strokeWidth={2.5} strokeLinecap="round" />
                </LegendItem>
                <LegendItem label={t('dailyBrief.ribbon.legendWater')}>
                    <Circle cx={6} cy={6} r={4.5} fill={c.successBorder} />
                </LegendItem>
                <LegendItem label={t('dailyBrief.ribbon.legendAlert')}>
                    <Polygon points="6,1 1,11 11,11" fill={c.dangerBorder} />
                </LegendItem>
                <LegendItem label={t('dailyBrief.ribbon.legendOther')}>
                    <Rect x={3} y={3} width={6} height={6} rx={1} fill={c.textTertiary} />
                </LegendItem>
                <LegendItem label={t('dailyBrief.ribbon.legendPreDawn')}>
                    <Rect x={0} y={0} width={12} height={12} rx={2} fill={c.infoBg} stroke={c.infoBorder} strokeOpacity={0.4} />
                </LegendItem>
            </View>

            {selected == null ? (
                events.length > 0 && <Text style={styles.hint}>{t('dailyBrief.ribbon.hint')}</Text>
            ) : (
                <View style={styles.list} testID="ribbon-hour-list">
                    <Text style={styles.listTitle}>
                        {t('dailyBrief.ribbon.hourTitle', { time: `${String(selected).padStart(2, '0')}:00` })}
                    </Text>
                    {list.length === 0 ? (
                        <Text style={styles.hint}>{t('dailyBrief.ribbon.nothingThisHour')}</Text>
                    ) : (
                        [...list]
                            .sort((a, b) => a.at.localeCompare(b.at))
                            .map((e, i) => (
                                <View key={i} style={styles.item}>
                                    <Text style={styles.itemTime}>{e.allDay ? t('dailyBrief.ribbon.allDay') : istTime(e.at)}</Text>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={styles.itemKind}>
                                            {t(`dailyBrief.kinds.${e.kind}`)}
                                            {e.pondId && pondNames[e.pondId] ? <Text style={styles.itemPond}>{`  ${pondNames[e.pondId]}`}</Text> : null}
                                        </Text>
                                        {!!e.summary && <Text style={styles.itemSummary}>{e.summary}</Text>}
                                    </View>
                                </View>
                            ))
                    )}
                </View>
            )}
        </View>
    );
};

const LegendItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <View style={styles.legendItem}>
        <Svg width={12} height={12}>{children}</Svg>
        <Text style={styles.legendText}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[4], paddingBottom: theme.spacing[5] },
    title: { ...theme.typeScale.h3, color: c.textPrimary, marginBottom: theme.spacing[2] },
    stage: { height: H },
    hours: { flexDirection: 'row', top: TRACK_TOP },
    hour: { flex: 1 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing[4], rowGap: theme.spacing[1.5], marginTop: theme.spacing[2] },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1.5] },
    legendText: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    hint: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: theme.spacing[2] },
    list: { marginTop: theme.spacing[3] },
    listTitle: { ...theme.typeScale.labelLarge, color: c.textPrimary, marginBottom: theme.spacing[1] },
    item: { flexDirection: 'row', gap: theme.spacing[3], paddingVertical: theme.spacing[1.5] },
    itemTime: { ...theme.typeScale.numericSmall, color: c.textSecondary, width: 52 },
    itemKind: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    itemPond: { color: c.textTertiary },
    itemSummary: { ...theme.typeScale.numericSmall, color: c.textSecondary },
});
