import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { simulationsApi, SimulationScenarioType } from '../../api/simulations';

export const SimulationCreateScreen = ({ navigation }: any) => {
    const { t } = useTranslation();

    const [pondId, setPondId] = useState('');
    const [scenarioType, setScenarioType] = useState<SimulationScenarioType>('feed_change');
    const [feedPrice, setFeedPrice] = useState('');
    const [growthImprovement, setGrowthImprovement] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [stockingDensity, setStockingDensity] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const scenarioOptions: { label: string; value: SimulationScenarioType }[] = [
        { label: t('simulations.create.scenarioFeedChange'), value: 'feed_change' },
        { label: t('simulations.create.scenarioPriceChange'), value: 'price_change' },
        { label: t('simulations.create.scenarioStockingDensity'), value: 'stocking_density' },
    ];

    const handleRunSimulation = async () => {
        if (!pondId.trim()) {
            Alert.alert(t('simulations.create.validationTitle'), t('simulations.create.errorPondId'));
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await simulationsApi.run({
                pondId: pondId.trim(),
                scenarioType,
                variables: {
                    feedPrice: feedPrice ? parseFloat(feedPrice) : undefined,
                    growthImprovement: growthImprovement ? parseFloat(growthImprovement) : undefined,
                    sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
                    stockingDensity: stockingDensity ? parseFloat(stockingDensity) : undefined,
                },
            });
            navigation.navigate('SimulationResults', { resultData: data });
        } catch (error: any) {
            Alert.alert(t('simulations.create.simFailedTitle'), error.response?.data?.message || t('simulations.create.errorSimFailed'));
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
                <Text style={styles.title}>{t('simulations.create.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('simulations.create.subtitle')}</Text>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('simulations.create.sectionPond')}</Text>
                    <Input
                        label={t('simulations.create.labelPondId')}
                        value={pondId}
                        onChangeText={setPondId}
                        placeholder={t('simulations.create.placeholderPondId')}
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('simulations.create.sectionScenario')}</Text>
                    <View style={styles.row}>
                        {scenarioOptions.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.scenarioPill, scenarioType === opt.value && styles.scenarioPillActive]}
                                onPress={() => setScenarioType(opt.value)}
                            >
                                <Text style={[styles.scenarioPillText, scenarioType === opt.value && styles.scenarioPillTextActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('simulations.create.sectionVariables')}</Text>
                    {(scenarioType === 'feed_change') && (
                        <>
                            <Input label={t('simulations.create.labelFeedPrice')} value={feedPrice} onChangeText={setFeedPrice} keyboardType="decimal-pad" placeholder="e.g. 15000" />
                            <Input label={t('simulations.create.labelGrowthImprovement')} value={growthImprovement} onChangeText={setGrowthImprovement} keyboardType="decimal-pad" placeholder="e.g. 10" />
                        </>
                    )}
                    {(scenarioType === 'price_change') && (
                        <Input label={t('simulations.create.labelSellingPrice')} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="e.g. 80000" />
                    )}
                    {(scenarioType === 'stocking_density') && (
                        <Input label={t('simulations.create.labelStockingDensity')} value={stockingDensity} onChangeText={setStockingDensity} keyboardType="number-pad" placeholder="e.g. 120" />
                    )}
                </Card>

                <Button
                    title={t('simulations.create.runSimulation')}
                    onPress={handleRunSimulation}
                    loading={isLoading}
                    style={styles.runBtn}
                    icon="chart-timeline-variant"
                />
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
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[6],
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
        flexWrap: 'wrap',
        gap: theme.spacing[3],
    },
    halfCol: {
        flex: 1,
    },
    scenarioPill: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.borderDefault,
    },
    scenarioPillActive: {
        backgroundColor: theme.roles.light.primary,
    },
    scenarioPillText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    scenarioPillTextActive: {
        color: theme.roles.light.surface,
    },
    runBtn: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[8],
    },
});
