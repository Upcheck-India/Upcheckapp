import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from './LineChart';
import { theme } from '../../theme';
import {
    buildMultiSeries,
    ParameterSeries,
} from '../../features/chartSeries';

interface MultiParameterChartProps {
    series: ParameterSeries[];
    /** Rescale unlike-unit series onto a shared 0–100 axis (default true). */
    normalize?: boolean;
    height?: number;
}

const c = theme.roles.light;

/**
 * Overlays several water-quality parameters on one line chart for correlation
 * analysis. Unlike-scaled parameters are normalized to a shared 0–100 axis; the
 * legend shows each series' real min–max so absolute values stay legible.
 */
export const MultiParameterChart: React.FC<MultiParameterChartProps> = ({
    series,
    normalize = true,
    height = 220,
}) => {
    const built = buildMultiSeries(series, { normalize });

    if (built.datasets.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>
                    Not enough data to compare these parameters yet.
                </Text>
            </View>
        );
    }

    return (
        <View>
            <LineChart
                data={{ labels: built.labels, datasets: built.datasets }}
                yAxisSuffix={normalize ? '%' : ''}
                height={height}
            />
            <View style={styles.legend}>
                {built.legend.map((item) => (
                    <View key={item.key} style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                        <Text style={styles.legendRange}>
                            {formatRange(item.min, item.max)}
                        </Text>
                    </View>
                ))}
            </View>
            {normalize ? (
                <Text style={styles.note}>
                    Lines are scaled 0–100% per parameter to compare trends; see the
                    legend for each parameter's real range.
                </Text>
            ) : null}
        </View>
    );
};

function formatRange(min: number, max: number): string {
    const fmt = (n: number) =>
        Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

const styles = StyleSheet.create({
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: theme.radius.full,
    },
    legendLabel: {
        ...theme.typeScale.labelMedium,
        color: c.textPrimary,
    },
    legendRange: {
        ...theme.typeScale.caption,
        color: c.textSecondary,
    },
    note: {
        ...theme.typeScale.caption,
        color: c.textTertiary,
        marginTop: theme.spacing[2],
    },
    empty: {
        paddingVertical: theme.spacing[6],
        alignItems: 'center',
    },
    emptyText: {
        ...theme.typeScale.bodySmall,
        color: c.textSecondary,
    },
});

export default MultiParameterChart;
