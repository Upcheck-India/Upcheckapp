import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { ShrimpLogo } from './ShrimpLogo';
import { theme } from '../../theme';
import { moonPhase, upcomingPhases } from '../../features/moonPhase';
import { localizePhaseName } from '../../features/lunarPhaseI18n';

interface MoonPhaseCardProps {
    /** Injectable for tests; defaults to now. */
    date?: Date;
    /**
     * Single-line strip instead of the full card — for placement in a dense
     * dashboard where lunar phase is a nice-to-know, not a decision-driving
     * metric (docs/UI_UX_AUDIT.md homepage redesign: demote low-value-density
     * sections rather than give them the same visual weight as alerts/financials).
     */
    compact?: boolean;
}

const c = theme.roles.light;

/**
 * Compact lunar widget for the dashboard. Shows the current phase plus a molting
 * hint (shrimp molting peaks around new/full moon) and the next principal phase.
 */
export const MoonPhaseCard: React.FC<MoonPhaseCardProps> = ({ date, compact }) => {
    const { t } = useTranslation();
    const now = date ?? new Date();
    const phase = moonPhase(now);
    const next = upcomingPhases(now, 1)[0];
    const illumPct = Math.round(phase.illumination * 100);
    const phaseLabel = localizePhaseName(phase.name, t);

    if (compact) {
        return (
            <View style={styles.stripRow}>
                <Text style={styles.stripEmoji} accessibilityLabel={phaseLabel}>{phase.emoji}</Text>
                <Text style={styles.stripText} numberOfLines={1}>
                    {phaseLabel} · {t('engines.lunar.illuminated', { pct: illumPct })}
                </Text>
                {phase.isMoltingWindow ? (
                    <View style={styles.stripMoltBadge}>
                        <Text style={styles.stripMoltBadgeText}>{t('engines.lunar.moltingHint')}</Text>
                    </View>
                ) : null}
            </View>
        );
    }

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.emoji} accessibilityLabel={phaseLabel}>
                    {phase.emoji}
                </Text>
                <View style={styles.body}>
                    <Text style={styles.name}>{phaseLabel}</Text>
                    <Text style={styles.meta}>{t('engines.lunar.illuminated', { pct: illumPct })}</Text>
                    {next ? (
                        <Text style={styles.meta}>
                            {next.emoji} {t('engines.lunar.nextPhaseIn', { phase: localizePhaseName(next.name, t), days: next.inDays })}
                        </Text>
                    ) : null}
                </View>
            </View>
            {phase.isMoltingWindow ? (
                <View style={styles.moltBanner}>
                    <ShrimpLogo size={18} color={c.infoText} eyeColor={c.infoBg} />
                    <Text style={styles.moltText}>
                        {t('engines.lunar.moltingHint')}
                    </Text>
                </View>
            ) : null}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: theme.spacing[6],
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[4],
    },
    emoji: {
        fontSize: 40,
        lineHeight: 46,
    },
    body: {
        flex: 1,
        gap: 2,
    },
    name: {
        ...theme.typeScale.h3,
        color: c.textPrimary,
    },
    meta: {
        ...theme.typeScale.bodySmall,
        color: c.textSecondary,
    },
    moltBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginTop: theme.spacing[3],
        backgroundColor: c.infoBg,
        borderRadius: theme.radius.sm,
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderLeftWidth: 3,
        borderLeftColor: c.infoBorder,
    },
    moltText: {
        ...theme.typeScale.bodySmall,
        color: c.infoText,
        flex: 1,
    },
    stripRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    stripEmoji: {
        fontSize: 20,
        lineHeight: 24,
    },
    stripText: {
        ...theme.typeScale.bodySmall,
        color: c.textSecondary,
        flex: 1,
    },
    stripMoltBadge: {
        backgroundColor: c.infoBg,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 2,
    },
    stripMoltBadgeText: {
        ...theme.typeScale.labelSmall,
        color: c.infoText,
    },
});

export default MoonPhaseCard;
