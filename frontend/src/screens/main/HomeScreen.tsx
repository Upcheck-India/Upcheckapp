import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export const HomeScreen = ({ navigation }: any) => {
    const { user, logout } = useAuthStore();

    const quickActions = [
        { icon: 'barn' as const, label: 'Farms', screen: 'FarmsList', color: Colors.primary },
        { icon: 'calculator-variant-outline' as const, label: 'Calculators', screen: 'CalculatorHub', color: Colors.info },
        { icon: 'book-open-outline' as const, label: 'Diseases', screen: 'DiseaseList', color: Colors.warning },
        { icon: 'chart-timeline-variant' as const, label: 'Simulate', screen: 'SimulationList', color: Colors.success },
    ];

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.userName}>
                        {user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'Farmer'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.avatar}>
                    <MaterialCommunityIcons name="account-circle" size={40} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.grid}>
                {quickActions.map((action) => (
                    <TouchableOpacity
                        key={action.label}
                        style={styles.actionCard}
                        onPress={() => {
                            // Navigation will be connected in Phase 2+
                            // navigation.navigate(action.screen);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: action.color + '15' }]}>
                            <MaterialCommunityIcons name={action.icon} size={28} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Card style={styles.infoCard}>
                <MaterialCommunityIcons name="information-outline" size={20} color={Colors.info} />
                <Text style={styles.infoText}>
                    Phase 1 complete! Farm management, data entry, and calculator screens will be added in upcoming phases.
                </Text>
            </Card>

            <Button
                title="Sign Out"
                onPress={logout}
                variant="outlined"
                style={{ marginTop: spacing.xl }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    greeting: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
    },
    userName: {
        ...typography.h2,
        color: Colors.textPrimary,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    actionCard: {
        width: '47%',
        backgroundColor: Colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    actionLabel: {
        ...typography.labelLarge,
        color: Colors.textPrimary,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: Colors.statusInfoBg,
        borderLeftWidth: 3,
        borderLeftColor: Colors.info,
    },
    infoText: {
        ...typography.bodySmall,
        color: Colors.statusInfoText,
        flex: 1,
        lineHeight: 18,
    },
});
