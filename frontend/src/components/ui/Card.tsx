import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, radius, spacing, shadows } from '../../theme';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated' }) => {
    return (
        <View
            style={[
                styles.base,
                variant === 'elevated' && styles.elevated,
                variant === 'outlined' && styles.outlined,
                variant === 'flat' && styles.flat,
                style,
            ]}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: radius.lg,
        padding: spacing.md,
        backgroundColor: Colors.surface,
    },
    elevated: {
        ...shadows.sm,
    },
    outlined: {
        borderWidth: 1,
        borderColor: Colors.border,
    },
    flat: {
        backgroundColor: Colors.surfaceVariant,
    },
});
