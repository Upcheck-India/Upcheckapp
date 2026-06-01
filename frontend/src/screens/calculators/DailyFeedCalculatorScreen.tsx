import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { calculatorsApi, DailyFeedResponse } from '../../api/calculators';

const FEEDING_RATE_TABLE = [
    { sizeRange: '< 3 g', rate: '8–10%' },
    { sizeRange: '3–5 g', rate: '6–8%' },
    { sizeRange: '5–10 g', rate: '4–6%' },
    { sizeRange: '10–15 g', rate: '3–4%' },
    { sizeRange: '15–20 g', rate: '2.5–3%' },
    { sizeRange: '> 20 g', rate: '2–2.5%' },
];

export const DailyFeedCalculatorScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const [mbwG, setMbwG] = useState('');
    const [srPct, setSrPct] = useState('');
    const [pondAreaM2, setPondAreaM2] = useState('');
    const [initialCount, setInitialCount] = useState('');
    const [feedingRatePct, setFeedingRatePct] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DailyFeedResponse | null>(null);
    const [biomassKg, setBiomassKg] = useState<number | null>(null);

    const handleCalculate = async () => {
        const mbw = parseFloat(mbwG);
        const sr = parseFloat(srPct);
        const count = parseFloat(initialCount);
        const fr = parseFloat(feedingRatePct);

        if (!mbw || mbw <= 0) {
            Alert.alert(t('calculators.dailyFeed.validationTitle'), t('calculators.dailyFeed.errorMbw'));
            return;
        }
        if (!sr || sr <= 0 || sr > 100) {
            Alert.alert(t('calculators.dailyFeed.validationTitle'), t('calculators.dailyFeed.errorSr'));
            return;
        }
        if (!count || count <= 0) {
            Alert.alert(t('calculators.dailyFeed.validationTitle'), t('calculators.dailyFeed.errorCount'));
            return;
        }
        if (!fr || fr <= 0) {
            Alert.alert(t('calculators.dailyFeed.validationTitle'), t('calculators.dailyFeed.errorFeedingRate'));
            return;
        }

        const computedBiomass = (count * sr / 100) * mbw / 1000;

        if (computedBiomass <= 0) {
            Alert.alert(t('common.error'), t('calculators.dailyFeed.errorBiomassZero'));
            return;
        }

        setBiomassKg(computedBiomass);
        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateDailyFeed({
                biomassKg: computedBiomass,
                feedingPercentage: fr,
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('calculators.dailyFeed.errorCalc'));
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
                <Text style={styles.title}>{t('calculators.dailyFeed.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('calculators.dailyFeed.sectionPondStock')}</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label={t('calculators.dailyFeed.labelMbw')}
                                value={mbwG}
                                onChangeText={setMbwG}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 12.5"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label={t('calculators.dailyFeed.labelSr')}
                                value={srPct}
                                onChangeText={setSrPct}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 85"
                                required
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label={t('calculators.dailyFeed.labelInitialCount')}
                                value={initialCount}
                                onChangeText={setInitialCount}
                                keyboardType="number-pad"
                                placeholder="e.g. 500000"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label={t('calculators.dailyFeed.labelPondArea')}
                                value={pondAreaM2}
                                onChangeText={setPondAreaM2}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 5000"
                            />
                        </View>
                    </View>
                    <Input
                        label={t('calculators.dailyFeed.labelFeedingRate')}
                        value={feedingRatePct}
                        onChangeText={setFeedingRatePct}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 2.5"
                        required
                    />

                    <Button title={t('calculators.dailyFeed.calculate')} onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {biomassKg !== null && (
                    <Card variant="flat" style={styles.biomassCard}>
                        <Text style={styles.biomassLabel}>{t('calculators.dailyFeed.estimatedBiomass')}</Text>
                        <Text style={styles.biomassValue}>{biomassKg.toFixed(1)} kg</Text>
                    </Card>
                )}

                {result && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>{t('calculators.dailyFeed.requiredDailyFeed')}</Text>
                        <Text style={styles.resultValue}>{result.dailyFeedKg.toFixed(2)} kg</Text>
                        <Text style={styles.resultSubtext}>{t('calculators.dailyFeed.distributeAcrossFeedings')}</Text>
                    </View>
                )}

                <Card style={styles.tableCard}>
                    <Text style={styles.tableTitle}>{t('calculators.dailyFeed.feedingRateReference')}</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>{t('calculators.dailyFeed.colShrimpSize')}</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>{t('calculators.dailyFeed.colRateBw')}</Text>
                    </View>
                    {FEEDING_RATE_TABLE.map((row, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                            <Text style={[styles.tableCell, { flex: 1 }]}>{row.sizeRange}</Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.rate}</Text>
                        </View>
                    ))}
                </Card>
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
        paddingHorizontal: theme.spacing[4],
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
    biomassCard: {
        marginBottom: theme.spacing[4],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    biomassLabel: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
    },
    biomassValue: {
        ...theme.typeScale.h4,
        color: theme.roles.light.primary,
    },
    resultBox: {
        backgroundColor: theme.roles.light.infoBg,
        padding: theme.spacing[8],
        borderRadius: theme.radius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.roles.light.primary,
        marginBottom: theme.spacing[6],
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
    tableCard: {
        marginBottom: theme.spacing[6],
    },
    tableTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: theme.spacing[2],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        marginBottom: theme.spacing[1],
    },
    tableHeaderCell: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: theme.spacing[2],
    },
    tableRowEven: {
        backgroundColor: theme.roles.light.background,
        borderRadius: theme.radius.sm,
    },
    tableCell: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textPrimary,
    },
});
