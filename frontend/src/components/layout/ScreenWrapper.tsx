import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar, KeyboardAvoidingView, Platform, RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { OfflineIndicator, SyncAttentionBanner } from '../ui/OfflineIndicator';

interface ScreenWrapperProps {
    children: React.ReactNode;
    scroll?: boolean;
    style?: ViewStyle;
    safeArea?: boolean;
    padded?: boolean;
    backgroundColor?: string;
    keyboardAvoiding?: boolean;
    /** Pull-to-refresh control for the scroll view (only applies when scroll). */
    refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
    children,
    scroll = true,
    style,
    safeArea = true,
    padded = true,
    backgroundColor = theme.roles.light.background,
    keyboardAvoiding = true,
    refreshControl,
}) => {
    const Container = safeArea ? SafeAreaView : View;

    const content = scroll ? (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[padded && styles.padded, style]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[styles.flex, padded && styles.padded, style]}>
            {children}
        </View>
    );

    const wrappedContent = keyboardAvoiding ? (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {content}
        </KeyboardAvoidingView>
    ) : content;

    return (
        <Container style={[styles.flex, { backgroundColor }]}>
            <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
            <OfflineIndicator />
            <SyncAttentionBanner />
            {wrappedContent}
        </Container>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    padded: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
});
