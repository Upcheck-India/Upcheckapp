import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    variant?: 'gradient' | 'flat';
    rightAction?: React.ReactNode;
    style?: ViewStyle;
    children?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    subtitle,
    variant = 'gradient',
    rightAction,
    style,
    children,
}) => {
    if (variant === 'flat') {
        return (
            <View style={[styles.flatContainer, style]}>
                <View style={styles.row}>
                    <View style={styles.textContainer}>
                        <Text variant="headlineSmall" style={styles.flatTitle}>{title}</Text>
                        {subtitle ? <Text style={styles.flatSubtitle}>{subtitle}</Text> : null}
                    </View>
                    {rightAction}
                </View>
                {children}
            </View>
        );
    }

    return (
        <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientContainer, style]}
        >
            <View style={styles.row}>
                <View style={styles.textContainer}>
                    <Text variant="headlineSmall" style={styles.gradientTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.gradientSubtitle}>{subtitle}</Text> : null}
                </View>
                {rightAction}
            </View>
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
        borderBottomLeftRadius: Layout.headerBorderRadius,
        borderBottomRightRadius: Layout.headerBorderRadius,
    },
    flatContainer: {
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.tabBarBorder,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    gradientTitle: {
        fontWeight: 'bold',
        color: Colors.textLight,
    },
    gradientSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        marginTop: Layout.spacing.xs,
        fontSize: 14,
    },
    flatTitle: {
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    flatSubtitle: {
        color: Colors.textSecondary,
        marginTop: Layout.spacing.xs,
        fontSize: 14,
    },
});
