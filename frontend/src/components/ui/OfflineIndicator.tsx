import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useSyncStore } from '../../store/syncStore';
import { theme } from '../../theme';

export const OfflineIndicator = () => {
    const isConnected = useSyncStore((s) => s.isConnected);
    const setConnected = useSyncStore((s) => s.setConnected);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    // Subscribe to NetInfo on mount; keep syncStore in sync.
    useEffect(() => {
        // Fetch the current state immediately so we don't wait for a change event.
        NetInfo.fetch().then((state) => {
            setConnected(state.isConnected ?? true);
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
            setConnected(state.isConnected ?? true);
        });

        return unsubscribe;
    }, [setConnected]);

    // Animate the banner in (slide down) when offline, out (slide up) when back online.
    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isConnected ? 0 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [isConnected, slideAnim]);

    // Don't render at all when connected (opacity 0 + translated away).
    // Using pointerEvents="none" when connected prevents accidental touch captures.
    return (
        <Animated.View
            pointerEvents={isConnected ? 'none' : 'box-none'}
            style={[
                styles.container,
                {
                    top: insets.top,
                    opacity: slideAnim,
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <MaterialCommunityIcons
                name="wifi-off"
                size={16}
                color={theme.roles.light.surface}
            />
            <Text style={styles.text}>Offline — Changes will sync later</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: theme.roles.light.dangerText,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing[1.5],
        zIndex: 999,
        elevation: 10,
    },
    text: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.surface,
        marginLeft: theme.spacing[2],
    },
});
