import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from './Card';
import { theme } from '../../theme';

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'flat';
    trendValue?: string;
    status?: 'safe' | 'warning' | 'critical' | 'normal';
    target?: number;
    targetLabel?: string;
    style?: StyleProp<ViewStyle>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    unit,
    trend,
    trendValue,
    status = 'normal',
    target,
    targetLabel,
    style,
}) => {
    const getStatusColor = () => {
        if (!status) return theme.roles.light.textPrimary;
        switch (status) {
            case 'safe': return theme.roles.light.successText;
            case 'warning': return theme.roles.light.warningText;
            case 'critical': return theme.roles.light.dangerText;
            default: return theme.roles.light.textPrimary;
        }
    };

    const getTrendColor = () => {
        if (!trend) return theme.roles.light.textSecondary;
        if (trend === 'up') return theme.roles.light.successText;
        if (trend === 'down') return theme.roles.light.dangerText;
        return theme.roles.light.textSecondary;
    };

    const renderTrendIcon = () => {
        if (trend === 'up') return 'menu-up';
        if (trend === 'down') return 'menu-down';
        return 'minus';
    };

    return (
        <Card style={[styles.container, style]}>
            <Text style={styles.label}>{label}</Text>

            <View style={styles.valueRow}>
                <Text style={[styles.value, { color: getStatusColor() }]}>{value}</Text>
                {unit && <Text style={styles.unit}>{unit}</Text>}
            </View>

            <View style={styles.footerRow}>
                {trend && trendValue && (
                    <View style={styles.trendContainer}>
                        <MaterialCommunityIcons name={renderTrendIcon()} size={20} color={getTrendColor()} />
                        <Text style={[styles.trendValue, { color: getTrendColor() }]}>{trendValue}</Text>
                    </View>
                )}

                {target !== undefined && (
                    <Text style={styles.targetLabel}>
                        {targetLabel || 'Target'}: {target}
                    </Text>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: 140, // Useful if rendered in a horizontal grid
    },
    label: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[1],
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: theme.spacing[2],
    },
    value: {
        ...theme.typeScale.numericLarge,
    },
    unit: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginLeft: theme.spacing[1],
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendBadge: {
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.tokens.card.borderRadius,
        paddingHorizontal: theme.tokens.card.paddingH,
        paddingVertical: theme.tokens.card.paddingV,
        ...theme.shadows.sm,
        marginRight: theme.spacing[1.5],
    },
    trendValue: {
        ...theme.typeScale.labelSmall,
        marginLeft: 2,
    },
    changeSubtitle: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
    },
    targetLabel: {
        ...theme.typeScale.caption,
        textAlign: 'right',
        flex: 1,
    },
});
