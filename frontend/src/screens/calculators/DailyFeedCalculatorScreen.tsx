import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, typography, spacing, radius } from '../../theme';
import { calculatorsApi, DailyFeedResponse } from '../../api/calculators';

export const DailyFeedCalculatorScreen = ({ navigation }: any) => {
    const [abw, setAbw] = useState('');
    const [estimatedSurvival, setEstimatedSurvival] = useState('');
    const [initialCount, setInitialCount] = useState('');
    const [feedPercentBodyWeight, setFeedPercentBodyWeight] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DailyFeedResponse | null>(null);

    const handleCalculate = async () => {
        if (!abw || !estimatedSurvival || !initialCount || !feedPercentBodyWeight) {
            Alert.alert('Validation Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateDailyFeed({
                abw: parseFloat(abw),
                estimatedSurvival: parseFloat(estimatedSurvival),
                initialCount: parseFloat(initialCount),
                feedPercentBodyWeight: parseFloat(feedPercentBodyWeight),
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Calculation failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Daily Feed Amount</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Pond Data</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Avg Body Wt (g)" value={abw} onChangeText={setAbw} keyboardType="decimal-pad" placeholder="e.g. 12.5" required />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Est. Survival (%)" value={estimatedSurvival} onChangeText={setEstimatedSurvival} keyboardType="decimal-pad" placeholder="e.g. 85" required />
                        </View>
                    </View>
                    <Input label="Initial Seed Count" value={initialCount} onChangeText={setInitialCount} keyboardType="number-pad" placeholder="e.g. 500000" required />
                    <Input label="Feed % of Body Weight" value={feedPercentBodyWeight} onChangeText={setFeedPercentBodyWeight} keyboardType="decimal-pad" placeholder="e.g. 2.5" required />

                    <Button title="Calculate" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {result && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Required Daily Feed</Text>
                        <Text style={styles.resultValue}>{result.dailyFeedKg.toFixed(2)} kg</Text>
                        <Text style={styles.resultSubtext}>Distribute across daily meals</Text>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    backBtn: {
        padding: spacing.md,
    },
    title: {
        ...typography.h3,
        color: Colors.textPrimary,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    card: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        ...typography.h4,
        color: Colors.textPrimary,
        marginBottom: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: spacing.sm,
    },
    resultBox: {
        backgroundColor: Colors.primaryLight,
        padding: spacing.xl,
        borderRadius: radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    resultLabel: {
        ...typography.h4,
        color: Colors.primary,
        marginBottom: spacing.xs,
    },
    resultValue: {
        fontSize: 36,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: spacing.xs,
    },
    resultSubtext: {
        ...typography.bodySmall,
        color: Colors.textSecondary,
    },
});
