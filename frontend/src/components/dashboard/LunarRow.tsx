import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import { Icon } from '../ui/Icon';
import { moonPhase } from '../../features/moonPhase';
import { localizePhaseName } from '../../features/lunarPhaseI18n';
import { formatDate } from '../../utils/formatDate';
import type { MoltWindowSummary } from '../../api/molt';

/**
 * Lunar phase and molting status, on Today.
 *
 * Shrimp molt around the new and full moon, and a molting pond is soft-shelled
 * — you feed it less, you do not handle it, and you do not harvest it. That is
 * a decision a farmer makes about today, which is exactly what this screen is
 * for.
 *
 * It earns its weight instead of being given it: inside a molt window the row
 * is tinted, names the dates and how many ponds still need action; outside it,
 * it is one quiet line naming the next window.
 *
 * The window comes from the server (`today.moltWindow`, true Meeus phase in
 * IST) — the same math the alerts and checklists use. The old client-side
 * mean-phase window disagreed with the backend at the edges. The phase emoji
 * and illumination are still local arithmetic (features/moonPhase.ts).
 */

export interface LunarRowProps {
    /** From `/alert-center/today`; null/undefined on an older backend or while loading. */
    moltWindow?: MoltWindowSummary | null;
    /** Injectable for tests; defaults to now. */
    date?: Date;
    /** Opens the full lunar / molt screen. */
    onPress?: () => void;
}

/** IST calendar day → short date, rendered at local noon so no TZ can shift it. */
const day = (d: string) => formatDate(`${d}T12:00:00`);

export const LunarRow: React.FC<LunarRowProps> = ({ moltWindow, date, onPress }) => {
    const { t } = useTranslation();
    const phase = moonPhase(date ?? new Date());
    const phaseLabel = localizePhaseName(phase.name, t);
    const w = moltWindow?.window ?? null;
    const molting = w !== null;

    const title = w
        ? t('home.moltWindowTitle', { start: day(w.preStart), end: day(w.postEnd), peak: day(w.peakDate) })
        : phaseLabel;
    const meta = w
        ? moltWindow!.eligiblePonds > 0
            ? t('home.moltPondsNeedAction', {
                  pending: moltWindow!.pondsWithPending,
                  total: moltWindow!.eligiblePonds,
              })
            : t('home.lunarMoltingBody')
        : moltWindow?.next
          ? t('home.moltNextWindow', { date: day(moltWindow.next.preStart) })
          : [
                phaseLabel,
                t('engines.lunar.illuminated', { pct: Math.round(phase.illumination * 100) }),
            ].join(' · ');

    return (
        <TouchableOpacity
            style={[styles.row, molting && styles.rowMolting]}
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : undefined}
            // The emoji IS the phase — no icon font draws a waxing gibbous — so
            // it is announced by name rather than read out as a glyph.
            accessibilityLabel={`${phaseLabel}. ${title}. ${meta}`}
        >
            <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
                {phase.emoji}
            </Text>
            <View style={styles.text}>
                <Text style={[styles.title, molting && styles.titleMolting]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={[styles.meta, molting && styles.metaMolting]} numberOfLines={2}>
                    {meta}
                </Text>
            </View>
            {!!onPress && (
                <Icon
                    name="chevron_right"
                    size={20}
                    color={molting ? c.warningText : c.textTertiary}
                />
            )}
        </TouchableOpacity>
    );
};

const c = theme.roles.light;

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingHorizontal: theme.spacing[5],
        paddingVertical: theme.spacing[2.5],
        borderTopWidth: 1,
        borderTopColor: c.surfaceVariant,
        backgroundColor: c.surface,
        minHeight: 56,
    },
    rowMolting: {
        backgroundColor: c.warningBg,
        borderTopColor: c.warningBorder,
    },
    emoji: { fontSize: 22 },
    text: { flex: 1, minWidth: 0 },
    title: { ...theme.typeScale.labelLarge, fontSize: 15, color: c.textPrimary },
    titleMolting: { color: c.warningText },
    meta: { ...theme.typeScale.bodySmall, color: c.textTertiary },
    metaMolting: { color: c.warningText },
});

export default LunarRow;
