import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

interface FABProps {
    onPress: () => void;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    style?: ViewStyle;
}

export const FAB: React.FC<FABProps> = ({
    onPress,
    icon,
    style,
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, style, theme.shadows.brandGlow]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={theme.gradients.brand.colors as [string, string, ...string[]]}
                start={theme.gradients.brand.start}
                end={theme.gradients.brand.end}
                style={styles.gradient}
            >
                <MaterialCommunityIcons name={icon} size={24} color={theme.roles.light.textInverse} />
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: theme.spacing[6],
        right: theme.spacing[6],
        width: 56,
        height: 56,
        borderRadius: theme.radius.full,
    },
    gradient: {
        width: '100%',
        height: '100%',
        borderRadius: theme.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
