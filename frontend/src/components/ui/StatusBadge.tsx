import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, typography, radius, spacing } from '../../theme';

export type StatusType = 'safe' | 'warning' | 'critical' | 'info' | 'active' | 'idle';

interface StatusBadgeProps {
    status: StatusType;
    label: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, style, textStyle }) => {
    const getColors = () => {
        switch (status) {
            case 'safe':
            case 'active':
                return { bg: Colors.statusSafeBg, text: Colors.statusSafeText, border: Colors.statusSafeBorder };
            case 'warning':
                return { bg: Colors.statusWarningBg, text: Colors.statusWarningText, border: Colors.statusWarningBorder };
            case 'critical':
                return { bg: Colors.statusCriticalBg, text: Colors.statusCriticalText, border: Colors.statusCriticalBorder };
            case 'info':
            case 'idle':
                return { bg: Colors.statusInfoBg, text: Colors.statusInfoText, border: Colors.statusInfoBorder };
            default:
                return { bg: Colors.chipIdle, text: Colors.chipIdleText, border: Colors.border };
        }
    };

    const colors = getColors();

    return (
        <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
            <Text style={[styles.text, { color: colors.text }, textStyle]}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    text: {
        ...typography.labelSmall,
        textTransform: 'uppercase',
    },
});
