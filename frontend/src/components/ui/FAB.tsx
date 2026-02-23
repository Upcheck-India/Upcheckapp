import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, shadows } from '../../theme';

interface FABProps {
    onPress: () => void;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    style?: ViewStyle;
    color?: string;
    backgroundColor?: string;
}

export const FAB: React.FC<FABProps> = ({
    onPress,
    icon = 'plus',
    style,
    color = Colors.textInverse,
    backgroundColor = Colors.primary,
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor }, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <MaterialCommunityIcons name={icon} size={28} color={color} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
});
