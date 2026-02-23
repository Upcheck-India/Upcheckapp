import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, StyleProp, View } from 'react-native';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

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

    const renderContent = () => (
        <>
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? theme.roles.light.textInverse : theme.roles.light.primary}
                />
            ) : (
                <>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
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
        </>
    );

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={isDisabled}
                activeOpacity={0.8}
                style={[styles.container, style, !isDisabled && theme.shadows.brandGlow]}
            >
                <LinearGradient
                    colors={(isDisabled ? [theme.roles.light.borderDefault, theme.roles.light.borderDefault] : theme.gradients.brand.colors) as [string, string, ...string[]]}
                    start={theme.gradients.brand.start}
                    end={theme.gradients.brand.end}
                    style={styles.primaryGradient}
                >
                    {renderContent()}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                styles.container,
                styles.base,
                variant === 'outlined' && styles.outlined,
                variant === 'text' && styles.text,
                isDisabled && styles.disabled,
                style,
            ]}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.tokens.button.radiusPrimary,
    },
    primaryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.tokens.button.paddingH,
        borderRadius: theme.tokens.button.radiusPrimary,
        height: theme.tokens.button.heightMd,
    },
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.tokens.button.paddingH,
        height: theme.tokens.button.heightMd,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.roles.light.primary,
    },
    text: {
        backgroundColor: 'transparent',
        paddingHorizontal: theme.spacing[2],
    },
    disabled: {
        opacity: 0.5,
    },
    label: {
        ...theme.typeScale.labelLarge,
    },
    iconContainer: {
        marginRight: theme.spacing[2],
    },
    primaryLabel: {
        color: theme.roles.light.textInverse,
    },
    outlinedLabel: {
        color: theme.roles.light.primary,
    },
    textLabel: {
        color: theme.roles.light.primary,
    },
    disabledLabel: {
        color: theme.roles.light.textDisabled,
    },
});
