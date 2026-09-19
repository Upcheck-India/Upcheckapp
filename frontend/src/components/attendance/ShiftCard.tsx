/**
 * One farm's shift card (spec 2026-09-14 attendance B.3) — the Team tab's
 * "My shift" and the roster's self card use this same component, so the farm
 * name and the state are always there (B6).
 *
 * State is bar + badge icon + words, never colour alone. The card reads as one
 * sentence to a screen reader.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';
import { theme } from '../../theme';
import { formatTime, formatWeekday } from '../../utils/formatDate';
import { BADGE_KEY, shiftLine, type FarmCard, type ShiftState, type TFn } from '../../features/attendance/shiftState';

const c = theme.roles.light;

export const STATE_LOOK: Record<ShiftState, { icon: IconName; bar: string; text: string }> = {
    forgot: { icon: 'warning', bar: c.dangerBorder, text: c.dangerText },
    overdue: { icon: 'alarm', bar: c.dangerBorder, text: c.dangerText },
    due_soon: { icon: 'schedule', bar: c.warningBorder, text: c.warningText },
    just_in: { icon: 'login', bar: c.successBorder, text: c.successText },
    on_shift: { icon: 'schedule', bar: c.successBorder, text: c.successText },
    out: { icon: 'logout', bar: c.borderDefault, text: c.textSecondary },
    on_leave: { icon: 'event_busy', bar: c.staleBorder, text: c.staleText },
    not_in: { icon: 'schedule', bar: c.borderDefault, text: c.textSecondary },
};

/** The badge: icon + words in the state's colour. */
export const ShiftBadge = ({ state }: { state: ShiftState }) => {
    const { t } = useTranslation();
    const look = STATE_LOOK[state];
    return (
        <View style={[styles.badge, { borderColor: look.bar }]}>
            <Icon name={look.icon} size={16} color={look.text} />
            <Text style={[styles.badgeText, { color: look.text }]} numberOfLines={1}>
                {t(BADGE_KEY[state])}
            </Text>
        </View>
    );
};

/** The sentence under the badge, formatted for the app's language. */
export const useShiftLine = () => {
    const { t } = useTranslation();
    return (card: FarmCard, now: Date) =>
        shiftLine(card, now, { t: t as unknown as TFn, time: formatTime, day: formatWeekday });
};

interface Props {
    farmName: string;
    card: FarmCard;
    now: Date;
    actionLabel?: string;
    onAction?: () => void;
    busy?: boolean;
    testID?: string;
}

export const ShiftCard = ({ farmName, card, now, actionLabel, onAction, busy, testID }: Props) => {
    const { t } = useTranslation();
    const line = useShiftLine()(card, now);
    const look = STATE_LOOK[card.state];
    return (
        <View style={styles.card} testID={testID}>
            <View style={[styles.bar, { backgroundColor: look.bar }]} />
            <View
                style={styles.body}
                accessible
                accessibilityLabel={`${farmName}. ${t(BADGE_KEY[card.state])}. ${line}`}
            >
                <View style={styles.top}>
                    <Text style={styles.farm} numberOfLines={1}>{farmName}</Text>
                    <ShiftBadge state={card.state} />
                </View>
                <Text style={styles.line}>{line}</Text>
            </View>
            {actionLabel && onAction ? (
                <Button title={actionLabel} onPress={onAction} disabled={busy} style={styles.btn} />
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        marginHorizontal: theme.spacing[4],
        marginTop: theme.spacing[2],
        paddingRight: theme.spacing[3],
        backgroundColor: c.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: c.borderDefault,
        overflow: 'hidden',
        flexWrap: 'wrap',
    },
    bar: { width: 5, alignSelf: 'stretch' },
    body: { flex: 1, minWidth: 180, paddingVertical: theme.spacing[3], gap: theme.spacing[1] },
    top: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap' },
    farm: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '700', flexShrink: 1 },
    line: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 2,
    },
    badgeText: { ...theme.typeScale.labelSmall, fontWeight: '700' },
    btn: { paddingHorizontal: theme.spacing[4], marginVertical: theme.spacing[2] },
});
