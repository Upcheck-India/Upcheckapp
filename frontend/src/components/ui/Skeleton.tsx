import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import { theme } from '../../theme';

interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
}) => {
    return (
        <View
            style={[
                styles.skeleton,
                { width, height, borderRadius },
                style,
            ]}
        />
    );
};

export const SkeletonCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
    return (
        <View style={[styles.card, style]}>
            <Skeleton width="60%" height={24} style={styles.mb2} />
            <Skeleton width="80%" height={16} style={styles.mb1} />
            <Skeleton width="40%" height={16} />
        </View>
    );
};

export const SkeletonList: React.FC<{ count?: number; style?: StyleProp<ViewStyle> }> = ({
    count = 3,
    style,
}) => {
    return (
        <View style={style}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} style={i < count - 1 ? styles.mb3 : undefined} />
            ))}
        </View>
    );
};

export const SkeletonGrid: React.FC<{ count?: number; columns?: number; style?: StyleProp<ViewStyle> }> = ({
    count = 4,
    columns = 2,
    style,
}) => {
    const rows = Math.ceil(count / columns);
    return (
        <View style={style}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                    {Array.from({ length: columns }).map((_, colIndex) => {
                        const itemIndex = rowIndex * columns + colIndex;
                        if (itemIndex >= count) return null;
                        return (
                            <View key={colIndex} style={[styles.gridItem, columns === 2 ? styles.halfWidth : styles.quarterWidth]}>
                                <Skeleton width="100%" height={80} borderRadius={8} />
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

export const SkeletonAvatar: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({
    size = 48,
    style,
}) => {
    return (
        <Skeleton
            width={size}
            height={size}
            borderRadius={size / 2}
            style={style}
        />
    );
};

export const SkeletonMetric: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
    return (
        <View style={[styles.metricContainer, style]}>
            <Skeleton width={40} height={40} borderRadius={20} style={styles.mb2} />
            <Skeleton width="60%" height={12} style={styles.mb1} />
            <Skeleton width="80%" height={28} />
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: theme.roles.light.surfaceVariant,
        opacity: 0.7,
    },
    card: {
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    mb1: {
        marginBottom: theme.spacing[1],
    },
    mb2: {
        marginBottom: theme.spacing[2],
    },
    mb3: {
        marginBottom: theme.spacing[3],
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
    },
    gridItem: {
        flex: 1,
    },
    halfWidth: {
        maxWidth: '48%',
    },
    quarterWidth: {
        maxWidth: '23%',
    },
    metricContainer: {
        alignItems: 'center',
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing[3],
        minWidth: 100,
    },
});