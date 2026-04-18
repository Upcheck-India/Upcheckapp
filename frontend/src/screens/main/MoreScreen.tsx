import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { theme } from '../../theme';

export const MoreScreen = () => {
    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>More</Text>
                <Text style={styles.subtitle}>Additional features and settings.</Text>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[2],
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
});
