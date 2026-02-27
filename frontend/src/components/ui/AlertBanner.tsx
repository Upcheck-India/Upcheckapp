import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

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
                    icon: 'alert-circle',
                    bg: theme.roles.light.dangerBg,
                    text: theme.roles.light.dangerText,
                    border: theme.roles.light.dangerBorder,
                };
            case 'info':
                return {
                    icon: 'information',
                    bg: theme.roles.light.infoBg,
                    text: theme.roles.light.infoText,
                    border: theme.roles.light.infoBorder,
                };
            case 'warning':
            default:
                return {
                    icon: 'alert',
                    bg: theme.roles.light.warningBg,
                    text: theme.roles.light.warningText,
                    border: theme.roles.light.warningBorder,
                };
        }
    };

    const config = getConfig();
    const iconName = icon || config.icon;

    return (
        <View style={[styles.container, { backgroundColor: config.bg, borderLeftColor: config.border }, style]}>
            <MaterialCommunityIcons name={iconName as keyof typeof MaterialCommunityIcons.glyphMap} size={24} color={config.border} style={styles.iconContainer} />
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
        paddingHorizontal: theme.tokens.alertBanner.paddingH,
        paddingVertical: theme.tokens.alertBanner.paddingV,
        borderRadius: theme.tokens.alertBanner.borderRadius,
        borderLeftWidth: theme.tokens.alertBanner.borderLeftWidth,
        marginBottom: theme.spacing[4],
    },
    iconContainer: {
        marginRight: theme.spacing[3],
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    title: {
        fontFamily: 'DMSans-SemiBold',
        fontSize: 14,
        marginBottom: theme.spacing[1],
    },
    message: {
        fontFamily: theme.tokens.alertBanner.fontFamily,
        fontSize: theme.tokens.alertBanner.fontSize,
    },
});
