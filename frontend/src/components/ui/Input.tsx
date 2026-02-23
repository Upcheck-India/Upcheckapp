import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, typography, radius, spacing } from '../../theme';

interface InputProps extends TextInputProps {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
    isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    required = false,
    leftIcon,
    isPassword = false,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
            >
                {leftIcon && (
                    <MaterialCommunityIcons
                        name={leftIcon}
                        size={20}
                        color={isFocused ? Colors.primary : Colors.textSecondary}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={Colors.textDisabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <MaterialCommunityIcons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={Colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {hint && !error && <Text style={styles.hint}>{hint}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.labelMedium,
        color: Colors.textPrimary,
        marginBottom: spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: radius.md,
        backgroundColor: Colors.surface,
        paddingHorizontal: spacing.md,
    },
    inputFocused: {
        borderColor: Colors.primary,
    },
    inputError: {
        borderColor: Colors.error,
    },
    leftIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        ...typography.bodyMedium,
        color: Colors.textPrimary,
        paddingVertical: spacing.md - 2,
    },
    eyeIcon: {
        padding: spacing.xs,
    },
    error: {
        ...typography.bodySmall,
        color: Colors.error,
        marginTop: spacing.xs,
    },
    hint: {
        ...typography.caption,
        marginTop: spacing.xs,
    },
});
