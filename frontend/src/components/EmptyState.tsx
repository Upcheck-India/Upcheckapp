import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { GradientButton } from './GradientButton';

interface EmptyStateProps {
    icon: string;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={icon as any} size={48} color={Colors.primary} />
            </View>
            <Text variant="titleMedium" style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {actionLabel && onAction ? (
                <GradientButton
                    title={actionLabel}
                    onPress={onAction}
                    style={styles.button}
                />
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: Layout.spacing.xxxl,
        paddingHorizontal: Layout.spacing.xl,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.lg,
    },
    title: {
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Layout.spacing.sm,
    },
    subtitle: {
        color: Colors.textSecondary,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        marginTop: Layout.spacing.xl,
        minWidth: 200,
    },
});
