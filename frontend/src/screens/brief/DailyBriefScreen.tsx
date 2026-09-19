/**
 * Daily Brief — one IST day of a farm (or all farms) on one page.
 * Spec: docs/superpowers/specs/2026-09-14-daily-brief-design.md
 *
 * Replaces MorningBriefingScreen (that route renders this now). One read,
 * `GET /daily-brief`, cached under the persisted `briefing` root so a phone
 * with no signal opens on the last copy with its age.
 *
 * Design: the score and the Day Ribbon are the only loud things. Every other
 * block is a titled, hairline-separated section — no card per block — and the
 * block ORDER leans with the time of day: mornings lead with what carried over,
 * evenings and past days lead with the numbers.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { keepPreviousData } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { CacheNotice } from '../../components/ui/CacheNotice';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Icon } from '../../components/ui/Icon';
import { VerdictScore } from '../../components/brief/VerdictScore';
import { ScoreExplainerSheet } from '../../components/brief/ScoreExplainerSheet';
import { DayRibbon } from '../../components/brief/DayRibbon';
import { CarriedOver } from '../../components/brief/CarriedOver';
import { TodoToday, type LogKind } from '../../components/brief/TodoToday';
import { HappeningToday } from '../../components/brief/HappeningToday';
import { PondGlanceList } from '../../components/brief/PondGlanceList';
import { DayNumbers } from '../../components/brief/DayNumbers';
import { DayCardRenderer } from '../../components/brief/DayCardSvg';
import { DayStory } from '../../components/brief/DayStory';
import { WhatWeDid } from '../../components/brief/WhatWeDid';
import { HIT, c } from '../../components/brief/Section';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../theme';
import { dailyBriefApi, type DailyBrief } from '../../api/dailyBrief';
import { qk } from '../../query/client';
import { useAppQuery, useRefetchOnFocus } from '../../query/hooks';
import { formatWeekday } from '../../utils/formatDate';
import { toLocalISODate } from '../../utils/localDate';
import {
    MIN_BRIEF_DATE,
    briefMode,
    greetingText,
    istDate,
    localNoon,
    pondNameMap,
    shiftDate,
    type BriefMode,
} from '../../features/dailyBriefText';
import { exportDayReportPdf, shareDayCardImage } from '../../features/export/dayReport';
const LOG_ROUTE: Record<LogKind, string> = {
    water: 'WaterQualityLog',
    feed: 'FeedLog',
    // Tray checks are keyed by crop, which the brief does not carry; the pond's
    // daily routine has the tray step and knows its crop.
    tray: 'DailyRoutine',
    mortality: 'MortalityLog',
};

const validDate = (d: unknown, today: string): string | null =>
    typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= MIN_BRIEF_DATE && d <= today ? d : null;

export const DailyBriefScreen = ({ navigation, route }: any) => {
    const { t, i18n } = useTranslation();
    const today = istDate();
    const [date, setDate] = useState(() => validDate(route?.params?.date, today) ?? today);
    const [farmId, setFarmId] = useState<string | null>(route?.params?.farmId ?? null);
    const [farmMenu, setFarmMenu] = useState(false);
    const [explain, setExplain] = useState(false);
    const [busy, setBusy] = useState<'pdf' | 'image' | null>(null);
    const userName = useAuthStore((s) => s.user?.name);
    const insets = useSafeAreaInsets();

    // A notification tap or a link can land here while the screen is mounted.
    useEffect(() => {
        const d = validDate(route?.params?.date, istDate());
        if (d) setDate(d);
        if (route?.params?.farmId !== undefined) setFarmId(route.params.farmId ?? null);
    }, [route?.params?.date, route?.params?.farmId]);

    const key = qk.dailyBrief(date, farmId);
    const query = useAppQuery<DailyBrief>({
        queryKey: key,
        queryFn: async () => (await dailyBriefApi.get(farmId ? { date, farmId } : { date })).data,
        // Switching day or farm keeps the last page up rather than flashing a skeleton.
        placeholderData: keepPreviousData,
    });
    useRefetchOnFocus(key);

    const brief = query.data;
    const mode: BriefMode = briefMode(date);
    const isToday = date === today;
    const names = brief ? pondNameMap(brief) : {};
    const goBack = () => (navigation.canGoBack?.() ? navigation.goBack() : navigation.navigate('MainApp'));

    const run = async (kind: 'pdf' | 'image') => {
        if (!brief || busy) return;
        setBusy(kind);
        try {
            if (kind === 'pdf') await exportDayReportPdf(brief, i18n.language);
            else await shareDayCardImage(brief, i18n.language);
        } catch {
            Alert.alert(t('common.error'), t('dailyBrief.actions.failed'));
        } finally {
            setBusy(null);
        }
    };

    const farms = brief?.farms ?? [];
    const farmLabel = farmId ? farms.find((f) => f.id === farmId)?.name ?? t('dailyBrief.allFarms') : t('dailyBrief.allFarms');

    const onLog = (kind: LogKind, pondId: string) =>
        navigation.navigate(LOG_ROUTE[kind], { pondId, pondName: names[pondId] });
    const onRoute = (r: string, pondId: string) => navigation.navigate(r, { pondId, pondName: names[pondId] });

    const blocks = (b: DailyBrief) => {
        const carried = <CarriedOver key="carried" brief={b} mode={mode} names={names} onRoute={onRoute} onSeeAlerts={isToday ? () => navigation.navigate('TodayAlerts') : undefined} />;
        const todo = <TodoToday key="todo" brief={b} isPast={!isToday} names={names} onLog={onLog} onRoute={onRoute} />;
        const happening = <HappeningToday key="happening" brief={b} isPast={!isToday} names={names} />;
        const ponds = (
            <PondGlanceList
                key="ponds"
                ponds={b.ponds}
                isToday={isToday}
                onOpen={(p) => navigation.navigate('PondDashboard', { pondId: p.pondId, pondName: p.name })}
                onRoutine={(p) => navigation.navigate('DailyRoutine', { pondId: p.pondId, pondName: p.name })}
            />
        );
        const numbers = <DayNumbers key="numbers" brief={b} />;
        const done = <WhatWeDid key="done" brief={b} names={names} />;
        switch (mode) {
            case 'morning':
                return [carried, todo, done, happening, ponds, numbers];
            case 'soFar':
                return [todo, done, carried, ponds, happening, numbers];
            default:
                return [done, numbers, ponds, todo, carried, happening];
        }
    };

    const body = () => {
        if (!brief) {
            if (query.isError) {
                return <ErrorState title={t('dailyBrief.empty.loadError')} error={query.error} onRetry={() => query.refetch()} />;
            }
            return (
                <View style={styles.skeleton} testID="brief-skeleton">
                    <Skeleton width={140} height={72} borderRadius={theme.radius.sm} />
                    <Skeleton width="85%" height={26} />
                    <Skeleton width="100%" height={68} borderRadius={theme.radius.md} />
                    <Skeleton width="60%" height={20} />
                    <Skeleton width="100%" height={18} />
                    <Skeleton width="100%" height={18} />
                </View>
            );
        }
        if (brief.farms.length === 0) {
            return (
                <EmptyState
                    icon="warehouse"
                    title={t('dailyBrief.empty.noFarmsTitle')}
                    subtitle={t('dailyBrief.empty.noFarmsBody')}
                    actionLabel={t('dailyBrief.empty.noFarmsCta')}
                    onAction={() => navigation.navigate('CreateFarm')}
                />
            );
        }
        if (brief.ponds.length === 0 && !brief.hasAnyData && isToday) {
            return (
                <EmptyState
                    icon="waves"
                    title={t('dailyBrief.empty.noPondsTitle')}
                    subtitle={t('dailyBrief.empty.noPondsBody')}
                    actionLabel={t('dailyBrief.empty.noPondsCta')}
                    onAction={() => navigation.navigate('MainApp', { screen: 'Farms' })}
                />
            );
        }
        return (
            <>
                {brief.hasAnyData ? (
                    <>
                        <VerdictScore brief={brief} onExplain={() => setExplain(true)} />
                        <DayStory brief={brief} />
                        <DayRibbon events={brief.timeline} isToday={isToday} pondNames={names} />
                    </>
                ) : (
                    <View style={styles.nothing} testID="brief-nothing-logged">
                        <Text style={styles.nothingTitle}>
                            {t('dailyBrief.empty.nothingLogged', { date: formatWeekday(localNoon(date)) })}
                        </Text>
                        <Text style={styles.nothingBody}>{t('dailyBrief.empty.nothingLoggedBody')}</Text>
                        {isToday && (
                            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('QuickLog')} accessibilityRole="button">
                                <Text style={styles.buttonText}>{t('dailyBrief.empty.logNow')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {blocks(brief)}

                {/* Room under the last block so the floating action bar never covers it. */}
                {brief.hasAnyData && <View style={{ height: BAR_H + theme.spacing[4] }} />}
                <ScoreExplainerSheet visible={explain} score={brief.score} onClose={() => setExplain(false)} />
                <DayCardRenderer />
            </>
        );
    };

    const canNext = date < today;
    const canPrev = date > MIN_BRIEF_DATE;
    const greeting = greetingText(t, userName, isToday ? null : formatWeekday(localNoon(date)));
    const showBar = !!brief?.hasAnyData && brief.farms.length > 0;

    return (
        <View style={styles.root}>
        <ScreenWrapper
            padded={false}
            backgroundColor={c.surface}
            refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isPlaceholderData} onRefresh={() => query.refetch()} colors={[c.primary]} tintColor={c.primary} />}
        >
            <ScreenHeader
                title={t(`dailyBrief.modes.${mode}`)}
                onBack={goBack}
                actionLabel={farms.length > 1 ? `${farmLabel} ▾` : undefined}
                onAction={() => setFarmMenu((v) => !v)}
            />

            {farmMenu && farms.length > 1 && (
                <View style={styles.farmList} accessibilityLabel={t('dailyBrief.chooseFarm')}>
                    {[{ id: null as string | null, name: t('dailyBrief.allFarms') }, ...farms].map((f) => (
                        <TouchableOpacity
                            key={f.id ?? 'all'}
                            style={styles.farmRow}
                            onPress={() => {
                                setFarmId(f.id);
                                setFarmMenu(false);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: farmId === f.id }}
                        >
                            <Text style={[styles.farmLabel, farmId === f.id && styles.farmLabelActive]}>{f.name}</Text>
                            {farmId === f.id && <Icon name="check" size={20} color={c.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <Text style={styles.greeting} accessibilityRole="header" testID="brief-greeting">{greeting}</Text>

            <View style={styles.dateBar}>
                <TouchableOpacity
                    onPress={() => setDate(shiftDate(date, -1))}
                    disabled={!canPrev}
                    hitSlop={HIT}
                    style={styles.dateArrow}
                    accessibilityRole="button"
                    accessibilityLabel={t('dailyBrief.previousDay')}
                    testID="brief-prev-day"
                >
                    <Icon name="chevron_left" size={26} color={canPrev ? c.textPrimary : c.textDisabled} />
                </TouchableOpacity>
                <CalendarPicker
                    label={t('dailyBrief.pickDate')}
                    value={localNoon(date)}
                    minDate={localNoon(MIN_BRIEF_DATE)}
                    maxDate={localNoon(today)}
                    onChange={(d) => setDate(validDate(toLocalISODate(d), today) ?? today)}
                    renderTrigger={(open) => (
                        <TouchableOpacity onPress={open} style={styles.dateCenter} accessibilityRole="button" accessibilityHint={t('dailyBrief.pickDate')}>
                            <Text style={styles.dateText} testID="brief-date">{formatWeekday(localNoon(date))}</Text>
                            {isToday && <Text style={styles.todayTag}>{t('dailyBrief.today')}</Text>}
                        </TouchableOpacity>
                    )}
                />
                <TouchableOpacity
                    onPress={() => setDate(shiftDate(date, 1))}
                    disabled={!canNext}
                    hitSlop={HIT}
                    style={styles.dateArrow}
                    accessibilityRole="button"
                    accessibilityLabel={t('dailyBrief.nextDay')}
                    accessibilityState={{ disabled: !canNext }}
                    testID="brief-next-day"
                >
                    <Icon name="chevron_right" size={26} color={canNext ? c.textPrimary : c.textDisabled} />
                </TouchableOpacity>
            </View>

            <CacheNotice updatedAt={query.dataUpdatedAt} stale={query.isError} />

            {body()}
        </ScreenWrapper>
            {showBar && (
                <View style={[styles.bar, { paddingBottom: theme.spacing[3] + insets.bottom }]} testID="brief-action-bar">
                    <TouchableOpacity style={[styles.button, styles.barButton]} onPress={() => run('pdf')} disabled={!!busy} accessibilityRole="button" accessibilityState={{ busy: busy === 'pdf' }}>
                        <Icon name="receipt_long" size={18} color={c.textPrimary} />
                        <Text style={styles.buttonText}>{t('dailyBrief.actions.exportPdf')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.barButton, styles.buttonPrimary]} onPress={() => run('image')} disabled={!!busy} accessibilityRole="button" accessibilityState={{ busy: busy === 'image' }}>
                        <Icon name="share" size={18} color={c.textInverse} />
                        <Text style={[styles.buttonText, styles.buttonPrimaryText]}>{t('dailyBrief.actions.shareImage')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

/** Height of the floating action bar above the safe-area inset. */
const BAR_H = 48 + theme.spacing[3] * 2;

const styles = StyleSheet.create({
    farmList: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong },
    farmRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[5],
        minHeight: 48,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderDefault,
    },
    farmLabel: { ...theme.typeScale.bodyLarge, color: c.textPrimary },
    farmLabelActive: { fontFamily: 'DMSans-SemiBold', color: c.primary },
    dateBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.borderDefault,
    },
    dateArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    dateCenter: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2], minHeight: 44, paddingHorizontal: theme.spacing[3], justifyContent: 'center', alignSelf: 'center', paddingTop: theme.spacing[2.5] },
    dateText: { ...theme.typeScale.labelLarge, fontSize: 16, color: c.textPrimary },
    todayTag: { ...theme.typeScale.labelMedium, color: c.primary },
    skeleton: { padding: theme.spacing[5], gap: theme.spacing[4] },
    nothing: { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[6], paddingBottom: theme.spacing[5], gap: theme.spacing[2] },
    nothingTitle: { ...theme.typeScale.h1, color: c.textPrimary },
    nothingBody: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    root: { flex: 1, backgroundColor: c.surface },
    greeting: { ...theme.typeScale.h2, color: c.textPrimary, paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3], paddingBottom: theme.spacing[1] },
    bar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        gap: theme.spacing[3],
        paddingHorizontal: theme.spacing[5],
        paddingTop: theme.spacing[3],
        backgroundColor: c.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderStrong,
        ...theme.shadows.md,
    },
    buttonPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    buttonPrimaryText: { color: c.textInverse },
    barButton: { flex: 1, paddingHorizontal: theme.spacing[3] },
    button: {
        flexGrow: 1,
        flexDirection: 'row',
        gap: theme.spacing[2],
        alignSelf: 'flex-start',
        minHeight: 48,
        paddingHorizontal: theme.spacing[5],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: c.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: { ...theme.typeScale.labelLarge, color: c.textPrimary },
});

export default DailyBriefScreen;
