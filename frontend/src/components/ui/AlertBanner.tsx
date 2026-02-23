import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, typography, spacing } from '../../theme';

interface AlertBannerProps {
    title: string;
    message?: string;
    type?: 'warning' | 'critical' | 'info';
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    style?: ViewStyle;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
    title,
    message,
    type = 'warning',
    icon,
    style,
}) => {
    const getConfig = () => {
        switch (type) {
            case 'critical':
                return {
                    bg: Colors.statusCriticalBg,
                    text: Colors.statusCriticalText,
                    border: Colors.error,
                    defaultIcon: 'alert-circle' as const,
                };
            case 'info':
                return {
                    bg: Colors.statusInfoBg,
                    text: Colors.statusInfoText,
                    border: Colors.info,
                    defaultIcon: 'information' as const,
                };
            case 'warning':
            default:
                return {
                    bg: Colors.statusWarningBg,
                    text: Colors.statusWarningText,
                    border: Colors.warning,
                    defaultIcon: 'alert' as const,
                };
        }
    };

    const config = getConfig();
    const iconName = icon || config.defaultIcon;

    return (
        <View style={[styles.container, { backgroundColor: config.bg, borderLeftColor: config.border }, style]}>
            <MaterialCommunityIcons name={iconName} size={24} color={config.border} style={styles.icon} />
            <View style={styles.content}>
                <Text style={[styles.title, { color: config.border }]}>{title}</Text>
                {message && <Text style={[styles.message, { color: config.text }]}>{message}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: spacing.md,
        borderLeftWidth: 4,
        marginBottom: spacing.md,
    },
    icon: {
        marginRight: spacing.sm,
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    title: {
        ...typography.labelLarge,
        marginBottom: 2,
    },
    message: {
        ...typography.bodyMedium,
    },
});
