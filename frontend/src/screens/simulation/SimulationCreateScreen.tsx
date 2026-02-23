import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { simulationsApi } from '../../api/simulations';

export const SimulationCreateScreen = ({ navigation }: any) => {
    const [targetBiomassKg, setTargetBiomassKg] = useState('');
    const [expectedSurvivalRate, setExpectedSurvivalRate] = useState('');
    const [expectedAdg, setExpectedAdg] = useState('');
    const [initialAbw, setInitialAbw] = useState('0.1'); // Default PL size roughly
    const [targetAbw, setTargetAbw] = useState('');
    const [stockingDensity, setStockingDensity] = useState('');
    const [farmAreaM2, setFarmAreaM2] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleRunSimulation = async () => {
        if (!targetBiomassKg || !expectedSurvivalRate || !expectedAdg || !targetAbw || !stockingDensity || !farmAreaM2) {
            Alert.alert('Validation Error', 'Please fill in all simulation parameters');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await simulationsApi.create({
                targetBiomassKg: parseFloat(targetBiomassKg),
                expectedSurvivalRate: parseFloat(expectedSurvivalRate),
                expectedAdg: parseFloat(expectedAdg),
                initialAbw: parseFloat(initialAbw),
                targetAbw: parseFloat(targetAbw),
                stockingDensity: parseFloat(stockingDensity),
                farmAreaM2: parseFloat(farmAreaM2),
            });
            navigation.navigate('SimulationResults', { simulationId: data.id, resultData: data });
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
                <Text style={styles.subtitle}>Forecast your next culture cycle</Text>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Targets</Text>
                    <Input label="Target Total Biomass (kg) *" value={targetBiomassKg} onChangeText={setTargetBiomassKg} keyboardType="decimal-pad" placeholder="e.g. 5000" />
                    <Input label="Target Harvest Size (ABW g) *" value={targetAbw} onChangeText={setTargetAbw} keyboardType="decimal-pad" placeholder="e.g. 25" />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Variables</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Est. Survival (%) *" value={expectedSurvivalRate} onChangeText={setExpectedSurvivalRate} keyboardType="decimal-pad" placeholder="e.g. 80" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Est. ADG (g/day) *" value={expectedAdg} onChangeText={setExpectedAdg} keyboardType="decimal-pad" placeholder="e.g. 0.22" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Initial Size (g)" value={initialAbw} onChangeText={setInitialAbw} keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Density (PL/m²) *" value={stockingDensity} onChangeText={setStockingDensity} keyboardType="number-pad" placeholder="e.g. 80" />
                        </View>
                    </View>
                    <Input label="Total Effective Farm Area (m²) *" value={farmAreaM2} onChangeText={setFarmAreaM2} keyboardType="decimal-pad" placeholder="e.g. 10000" />
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
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    runBtn: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[8],
    },
});
