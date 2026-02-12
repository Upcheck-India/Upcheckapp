import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'secondary';
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    disabled = false,
    loading = false,
    variant = 'primary',
    icon,
}) => {
    const gradientColors = variant === 'primary'
        ? [Colors.gradientStart, Colors.gradientEnd] as const
        : [Colors.secondary, Colors.secondaryDark] as const;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[styles.container, style, disabled && styles.disabled]}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.textLight} size="small" />
                ) : (
                    <View style={styles.contentContainer}>
                        {icon && (
                            <MaterialCommunityIcons
                                name={icon}
                                size={24}
                                color={Colors.textLight}
                                style={styles.icon}
                            />
                        )}
                        <Text style={[styles.text, textStyle]}>{title}</Text>
                    </View>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    gradient: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: Colors.textLight,
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    disabled: {
        opacity: 0.6,
    },
});

export default GradientButton;
