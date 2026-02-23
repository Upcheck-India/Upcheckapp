import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from './Card';
import { Colors, typography, spacing } from '../../theme';

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
        switch (status) {
            case 'safe': return Colors.success;
            case 'warning': return Colors.warning;
            case 'critical': return Colors.error;
            default: return Colors.textPrimary;
        }
    };

    const getTrendIconColor = () => {
        if (trend === 'up') return Colors.success;
        if (trend === 'down') return Colors.error;
        return Colors.textSecondary;
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
                        <MaterialCommunityIcons name={renderTrendIcon()} size={20} color={getTrendIconColor()} />
                        <Text style={[styles.trendValue, { color: getTrendIconColor() }]}>{trendValue}</Text>
                    </View>
                )}

                {target !== undefined && targetLabel && (
                    <Text style={styles.targetLabel}>{targetLabel}</Text>
                )}
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        flex: 1,
        minWidth: 140, // Useful if rendered in a horizontal grid
    },
    label: {
        ...typography.labelMedium,
        color: Colors.textSecondary,
        marginBottom: spacing.xs,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.sm,
    },
    value: {
        ...typography.numericLarge,
    },
    unit: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        marginLeft: spacing.xs,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.sm,
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendValue: {
        ...typography.labelSmall,
        marginLeft: 2,
    },
    targetLabel: {
        ...typography.caption,
        textAlign: 'right',
        flex: 1,
    },
});
