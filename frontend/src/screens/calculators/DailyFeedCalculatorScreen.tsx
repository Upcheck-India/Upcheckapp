import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
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
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
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
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: theme.spacing[3],
    },
    resultBox: {
        backgroundColor: theme.roles.light.infoBg,
        padding: theme.spacing[8],
        borderRadius: theme.radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.roles.light.primary,
    },
    resultLabel: {
        ...theme.typeScale.h4,
        color: theme.roles.light.primary,
        marginBottom: theme.spacing[2],
    },
    resultValue: {
        fontSize: 36,
        fontWeight: '700',
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[2],
    },
    resultSubtext: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
    },
});
