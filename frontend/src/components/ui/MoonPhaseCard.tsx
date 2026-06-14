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
}

const c = theme.roles.light;

/**
 * Compact lunar widget for the dashboard. Shows the current phase plus a molting
 * hint (shrimp molting peaks around new/full moon) and the next principal phase.
 */
export const MoonPhaseCard: React.FC<MoonPhaseCardProps> = ({ date }) => {
    const { t } = useTranslation();
    const now = date ?? new Date();
    const phase = moonPhase(now);
    const next = upcomingPhases(now, 1)[0];
    const illumPct = Math.round(phase.illumination * 100);
    const phaseLabel = localizePhaseName(phase.name, t);

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
});

export default MoonPhaseCard;
