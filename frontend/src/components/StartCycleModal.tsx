import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Modal, Portal, TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { GradientButton } from './GradientButton';
import { CropsService } from '../services/cropsService';

interface StartCycleModalProps {
    visible: boolean;
    onDismiss: () => void;
    onSubmit: () => void;
    pond: any; // Using any for now to avoid circular deps or complex type import issues if Pond isn't readily available, but ideally Pond
}

export const StartCycleModal: React.FC<StartCycleModalProps> = ({ visible, onDismiss, onSubmit, pond }) => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [speciesType, setSpeciesType] = useState('vannamei'); // vannamei, monodon, etc
    const [seedType, setSeedType] = useState('net'); // net, gross, actual
    const [stockingCount, setStockingCount] = useState('');
    const [stockingDate, setStockingDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [targetSize, setTargetSize] = useState('40'); // pieces/kg
    const [targetDays, setTargetDays] = useState('120');

    // Derived State
    const pondArea = pond.overrideAreaM2 ?? pond.calculatedAreaM2 ?? 0;
    const density = stockingCount && pondArea > 0 ? Math.round(parseInt(stockingCount) / pondArea) : 0;

    const getDensityColor = () => {
        if (density > 400) return Colors.error;
        if (density > 150) return Colors.error;
        if (density > 50) return Colors.warning;
        return Colors.success;
    };

    const getDensityFeedback = () => {
        if (density === 0) return '';
        if (density > 400) return 'Density too high! reduce stocking count.';
        if (density > 150) return 'High Density (Intensive/Super-Intensive)';
        if (density > 50) return 'Medium Density (Semi-Intensive)';
        return 'Low Density (Extensive)';
    };

    const handleSubmit = async () => {
        if (!name || !stockingCount) {
            return; // Basic validation
        }

        if (density > 400) {
            return; // Block submission
        }

        setLoading(true);
        try {
            await CropsService.createCrop({
                pondId: pond.id,
                name,
                speciesType,
                seedType,
                stockingCount: parseInt(stockingCount),
                stockingDate: new Date(stockingDate).toISOString(),
                targetSize: parseInt(targetSize),
                targetCultivationDays: parseInt(targetDays),
                status: 'active',
                isActive: true,
                doc: 0, // Day 0
                stockingDensity: density,
            });
            onSubmit();
            resetForm();
        } catch (error) {
            console.error(error);
            // Error handling usually done via toast/alert in parent or here
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setStockingCount('');
        setTargetSize('40');
        setTargetDays('120');
        setSeedType('net');
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Start New Cycle</Text>

                    <TextInput
                        label="Cycle Name (e.g. VANN-01)"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    <Text variant="labelMedium" style={styles.sectionLabel}>Species</Text>
                    <SegmentedButtons
                        value={speciesType}
                        onValueChange={setSpeciesType}
                        buttons={[
                            { value: 'vannamei', label: 'Vannamei' },
                            { value: 'monodon', label: 'Monodon' },
                            { value: 'other', label: 'Other' },
                        ]}
                        style={styles.segmented}
                    />

                    <Text variant="labelMedium" style={styles.sectionLabel}>Seed Type</Text>
                    <SegmentedButtons
                        value={seedType}
                        onValueChange={setSeedType}
                        buttons={[
                            { value: 'net', label: 'Net (Verified)' },
                            { value: 'gross', label: 'Gross (Shipped)' },
                            { value: 'actual', label: 'Actual (Counted)' },
                        ]}
                        style={styles.segmented}
                    />

                    <View style={styles.row}>
                        <TextInput
                            label="Stocking Count"
                            value={stockingCount}
                            onChangeText={setStockingCount}
                            mode="outlined"
                            keyboardType="numeric"
                            style={[styles.input, { flex: 0.48 }]}
                            left={<TextInput.Icon icon="fish" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                        <TextInput
                            label="Date (YYYY-MM-DD)"
                            value={stockingDate}
                            onChangeText={setStockingDate}
                            mode="outlined"
                            style={[styles.input, { flex: 0.48 }]}
                            left={<TextInput.Icon icon="calendar" />}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                    </View>

                    {/* Density Feedback */}
                    <View style={{ marginBottom: Layout.spacing.md, backgroundColor: Colors.background, padding: 12, borderRadius: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Est. Stocking Density</Text>
                            <Text variant="titleMedium" style={{ color: getDensityColor(), fontWeight: 'bold' }}>
                                {density} PL/m²
                            </Text>
                        </View>
                        <Text variant="labelSmall" style={{ color: getDensityColor(), marginTop: 4, textAlign: 'right' }}>
                            {getDensityFeedback()}
                        </Text>
                        <Text variant="labelSmall" style={{ color: Colors.textTertiary, marginTop: 4 }}>
                            Based on pond area: {pondArea} m²
                        </Text>
                    </View>

                    <View style={styles.row}>
                        <TextInput
                            label="Target Size (cnt/kg)"
                            value={targetSize}
                            onChangeText={setTargetSize}
                            mode="outlined"
                            keyboardType="numeric"
                            style={[styles.input, { flex: 0.48 }]}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                        <TextInput
                            label="Target Days"
                            value={targetDays}
                            onChangeText={setTargetDays}
                            mode="outlined"
                            keyboardType="numeric"
                            style={[styles.input, { flex: 0.48 }]}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                    </View>

                    <GradientButton
                        title={loading ? "Starting Cycle..." : "Start Cycle"}
                        onPress={handleSubmit}
                        icon="play-circle"
                        disabled={loading || density > 400}
                        style={{ marginTop: Layout.spacing.sm, opacity: density > 400 ? 0.5 : 1 }}
                    />
                    <Button mode="text" onPress={onDismiss} disabled={loading} style={{ marginTop: Layout.spacing.sm }}>
                        Cancel
                    </Button>
                </ScrollView>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        backgroundColor: Colors.surface,
        padding: Layout.modalPadding,
        margin: Layout.modalMargin,
        borderRadius: Layout.modalRadius,
        maxHeight: '90%',
    },
    modalTitle: { marginBottom: Layout.spacing.lg, textAlign: 'center', color: Colors.text, fontWeight: '700' },
    input: { marginBottom: Layout.spacing.sm, backgroundColor: Colors.surface },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.sm },
    sectionLabel: { marginTop: Layout.spacing.sm, marginBottom: Layout.spacing.xs, color: Colors.textSecondary, fontWeight: '600' },
    segmented: { marginBottom: Layout.spacing.md },
});
