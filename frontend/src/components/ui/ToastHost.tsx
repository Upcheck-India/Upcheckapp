import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useUIStore, type Toast } from '../../store/uiStore';

/**
 * App-wide toast overlay. Renders the transient confirmations queued in the UI
 * store (e.g. "Saved" after a farmer logs a reading) above all screens. Mounted
 * once at the app root; individual screens just call `showToast(...)`.
 *
 * Designed for outdoor / low-literacy use: a bold icon carries the meaning, the
 * accent colour reinforces it, and the banner sits low near the thumb where the
 * save button was just tapped. Auto-dismissal timing lives in the store.
 */

const ROLE = theme.roles.light;

const TYPE_STYLE: Record<Toast['type'], { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string }> = {
    success: { icon: 'check-circle', color: ROLE.successText, bg: ROLE.successBg },
    error: { icon: 'alert-circle', color: ROLE.dangerText, bg: ROLE.dangerBg },
    warning: { icon: 'alert', color: ROLE.warningText, bg: ROLE.warningBg },
    info: { icon: 'information', color: ROLE.infoBorder, bg: ROLE.infoBg },
};

const ToastRow: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const conf = TYPE_STYLE[toast.type] ?? TYPE_STYLE.info;

    useEffect(() => {
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
    }, [anim]);

    return (
        <Animated.View
            style={[
                styles.toast,
                { backgroundColor: conf.bg, borderLeftColor: conf.color },
                {
                    opacity: anim,
                    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <MaterialCommunityIcons name={conf.icon} size={22} color={conf.color} style={styles.icon} />
            <Text style={[styles.message, { color: conf.color }]} numberOfLines={3}>
                {toast.message}
            </Text>
            <TouchableOpacity
                onPress={() => onDismiss(toast.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
            >
                <MaterialCommunityIcons name="close" size={18} color={conf.color} />
            </TouchableOpacity>
        </Animated.View>
    );
};

export const ToastHost: React.FC = () => {
    const insets = useSafeAreaInsets();
    const toasts = useUIStore((s) => s.toasts);
    const dismissToast = useUIStore((s) => s.dismissToast);

    if (toasts.length === 0) return null;

    return (
        <View style={[styles.host, { bottom: insets.bottom + theme.spacing[20] }]} pointerEvents="box-none">
            {toasts.map((toast) => (
                <ToastRow key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: theme.spacing[4],
        right: theme.spacing[4],
        gap: theme.spacing[2],
        zIndex: 9999,
        elevation: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.lg,
        borderLeftWidth: 4,
        ...theme.shadows.md,
    },
    icon: {
        marginRight: 0,
    },
    message: {
        flex: 1,
        ...theme.typeScale.bodyMedium,
        fontWeight: '600',
    },
});

export default ToastHost;
