import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { theme } from '../../theme';

interface EmptyStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox-outline',
    title,
    subtitle,
    actionLabel,
    onAction,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon} size={64} color={theme.roles.light.textDisabled} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.message}>{subtitle}</Text>}
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
        padding: theme.spacing[8],
    },
    iconContainer: {
        marginBottom: theme.spacing[6],
        opacity: 0.8,
    },
    title: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[3],
        textAlign: 'center',
    },
    message: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textDisabled,
        textAlign: 'center',
        marginBottom: theme.spacing[6],
    },
    button: {
        marginTop: theme.spacing[6],
    },
});
