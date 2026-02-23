import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors, typography, spacing } from '../../theme';

interface EmptyStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox-outline',
    title,
    subtitle,
    actionLabel,
    onAction,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <MaterialCommunityIcons name={icon} size={64} color={Colors.textDisabled} />
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="outlined"
                    style={styles.button}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        minHeight: 300,
    },
    title: {
        ...typography.h3,
        color: Colors.textSecondary,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.bodyMedium,
        color: Colors.textDisabled,
        marginTop: spacing.xs,
        textAlign: 'center',
        maxWidth: 280,
    },
    button: {
        marginTop: spacing.lg,
    },
});
