import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../theme';

export type StatusType = 'safe' | 'warning' | 'critical' | 'info' | 'active' | 'idle' | 'completed' | 'harvested';

interface StatusBadgeProps {
    status: StatusType;
    label: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, style, textStyle }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'active':
            case 'safe':
                return { bg: theme.roles.light.successBg, text: theme.roles.light.successText, border: theme.roles.light.successBorder };
            case 'warning':
                return { bg: theme.roles.light.warningBg, text: theme.roles.light.warningText, border: theme.roles.light.warningBorder };
            case 'critical':
                return { bg: theme.roles.light.dangerBg, text: theme.roles.light.dangerText, border: theme.roles.light.dangerBorder };
            case 'completed':
            case 'info':
                return { bg: theme.roles.light.infoBg, text: theme.roles.light.infoText, border: theme.roles.light.infoBorder };
            case 'idle':
            case 'harvested':
            default:
                // Map the old chipIdle semantics to standard surface tones
                return { bg: theme.roles.light.surfaceVariant, text: theme.roles.light.textSecondary, border: theme.roles.light.borderDefault };
        }
    };

    const colors = getStatusConfig();

    return (
        <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
            <Text numberOfLines={1} style={[styles.label, { color: colors.text }, textStyle]}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: theme.tokens.chip.paddingH,
        height: theme.tokens.chip.height,
        borderRadius: theme.tokens.chip.borderRadius,
        borderWidth: 1,
        alignSelf: 'flex-start',
        flexShrink: 0,
        maxWidth: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: theme.tokens.chip.fontFamily,
        fontSize: theme.tokens.chip.fontSize,
        letterSpacing: theme.tokens.chip.letterSpacing,
        textTransform: 'uppercase',
        flexShrink: 1,
    },
});
