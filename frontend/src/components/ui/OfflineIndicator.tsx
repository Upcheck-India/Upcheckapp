import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, typography, spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineIndicator = () => {
    const [isConnected, setIsConnected] = useState(true);
    const slideAnim = useState(new Animated.Value(-100))[0];
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected && state.isInternetReachable !== false;
            setIsConnected(connected ?? true);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isConnected ? -100 : insets.top, // Slide down to safe area top or hide
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isConnected, insets.top]);

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
            <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.surface} />
            <Text style={styles.text}>No internet connection. Using cached data.</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.error,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        zIndex: 999, // Ensure it sits on top of navigation & content
        elevation: 10,
    },
    text: {
        ...typography.labelMedium,
        color: Colors.surface,
        marginLeft: spacing.sm,
    },
});
