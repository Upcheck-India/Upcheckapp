import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { simulationsApi, SimulationScenarioType } from '../../api/simulations';

export const SimulationCreateScreen = ({ navigation }: any) => {
    const [pondId, setPondId] = useState('');
    const [scenarioType, setScenarioType] = useState<SimulationScenarioType>('feed_change');
    const [feedPrice, setFeedPrice] = useState('');
    const [growthImprovement, setGrowthImprovement] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [stockingDensity, setStockingDensity] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const scenarioOptions: { label: string; value: SimulationScenarioType }[] = [
        { label: 'Feed Change', value: 'feed_change' },
        { label: 'Price Change', value: 'price_change' },
        { label: 'Stocking Density', value: 'stocking_density' },
    ];

    const handleRunSimulation = async () => {
        if (!pondId.trim()) {
            Alert.alert('Validation Error', 'Please enter a Pond ID');
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
            Alert.alert('Simulation Failed', error.response?.data?.message || 'Failed to run simulation');
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
                <Text style={styles.title}>New Simulation</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Run a what-if scenario on an active pond cycle</Text>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Pond</Text>
                    <Input label="Pond ID *" value={pondId} onChangeText={setPondId} placeholder="UUID of the pond with an active cycle" />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Scenario Type</Text>
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
                    <Text style={styles.sectionTitle}>Variables</Text>
                    {(scenarioType === 'feed_change') && (
                        <>
                            <Input label="Feed Price (per kg)" value={feedPrice} onChangeText={setFeedPrice} keyboardType="decimal-pad" placeholder="e.g. 15000" />
                            <Input label="Growth Improvement (%)" value={growthImprovement} onChangeText={setGrowthImprovement} keyboardType="decimal-pad" placeholder="e.g. 10" />
                        </>
                    )}
                    {(scenarioType === 'price_change') && (
                        <Input label="Selling Price (per kg)" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="e.g. 80000" />
                    )}
                    {(scenarioType === 'stocking_density') && (
                        <Input label="Stocking Density (PL/m²)" value={stockingDensity} onChangeText={setStockingDensity} keyboardType="number-pad" placeholder="e.g. 120" />
                    )}
                </Card>

                <Button
                    title="Run Simulation"
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
