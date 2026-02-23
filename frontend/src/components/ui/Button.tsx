import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Colors, typography, radius, spacing } from '../../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'outlined' | 'text';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}) => {
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                styles.base,
                variant === 'primary' && styles.primary,
                variant === 'outlined' && styles.outlined,
                variant === 'text' && styles.text,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? Colors.textInverse : Colors.primary}
                />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.label,
                            variant === 'primary' && styles.primaryLabel,
                            variant === 'outlined' && styles.outlinedLabel,
                            variant === 'text' && styles.textLabel,
                            isDisabled && styles.disabledLabel,
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md - 2,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        gap: spacing.sm,
        minHeight: 48,
    },
    primary: {
        backgroundColor: Colors.primary,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    text: {
        backgroundColor: 'transparent',
        paddingHorizontal: spacing.sm,
    },
    disabled: {
        opacity: 0.5,
    },
    label: {
        ...typography.labelLarge,
    },
    primaryLabel: {
        color: Colors.textInverse,
    },
    outlinedLabel: {
        color: Colors.primary,
    },
    textLabel: {
        color: Colors.primary,
    },
    disabledLabel: {
        color: Colors.textDisabled,
    },
});
