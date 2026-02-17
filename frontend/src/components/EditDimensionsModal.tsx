import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Modal, Portal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { GradientButton } from './GradientButton';
import { Pond } from '../types/database';

interface EditDimensionsModalProps {
    visible: boolean;
    onDismiss: () => void;
    onSubmit: (updates: any) => Promise<void>;
    loading: boolean;
    pond: Pond;
}

export const EditDimensionsModal: React.FC<EditDimensionsModalProps> = ({ visible, onDismiss, onSubmit, loading, pond }) => {
    const [length, setLength] = useState(pond.lengthM?.toString() || '');
    const [width, setWidth] = useState(pond.widthM?.toString() || '');
    const [diameter, setDiameter] = useState(pond.diameterM?.toString() || '');
    const [depth, setDepth] = useState(pond.depthM.toString());
    const [overrideArea, setOverrideArea] = useState(pond.overrideAreaM2?.toString() || '');
    const [changeReason, setChangeReason] = useState('');

    useEffect(() => {
        if (visible) {
            setLength(pond.lengthM?.toString() || '');
            setWidth(pond.widthM?.toString() || '');
            setDiameter(pond.diameterM?.toString() || '');
            setDepth(pond.depthM.toString());
            setOverrideArea(pond.overrideAreaM2?.toString() || '');
            setChangeReason('');
        }
    }, [visible, pond]);

    const handleSubmit = async () => {
        const updates = {
            lengthM: length ? parseFloat(length) : null,
            widthM: width ? parseFloat(width) : null,
            diameterM: diameter ? parseFloat(diameter) : null,
            depthM: parseFloat(depth) || 0,
            overrideAreaM2: overrideArea ? parseFloat(overrideArea) : null,
            changeReason: changeReason || 'Manual adjustment',
        };
        await onSubmit(updates);
    };

    const isRectangular = pond.geometryType === 'rectangular' || pond.geometryType === 'raceway';
    const isCircular = pond.geometryType === 'circular';

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Update Pond Dimensions</Text>

                    <View style={styles.dimensionsBox}>
                        {isRectangular && (
                            <View style={styles.row}>
                                <TextInput label="Length (m)" value={length} onChangeText={setLength} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 0.48 }]} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                                <TextInput label="Width (m)" value={width} onChangeText={setWidth} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 0.48 }]} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                            </View>
                        )}
                        {isCircular && (
                            <TextInput label="Diameter (m)" value={diameter} onChangeText={setDiameter} mode="outlined" keyboardType="numeric" style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />
                        )}
                        <TextInput label="Depth (m)" value={depth} onChangeText={setDepth} mode="outlined" keyboardType="numeric" style={styles.input} outlineColor={Colors.border} activeOutlineColor={Colors.primary} />

                        <Divider text="Manual Override" style={{ marginVertical: 8 }} />

                        <TextInput
                            label="Override Area (m²)"
                            value={overrideArea}
                            onChangeText={setOverrideArea}
                            mode="outlined"
                            keyboardType="numeric"
                            style={styles.input}
                            placeholder="Optional"
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                    </View>

                    <TextInput
                        label="Reason for Change *"
                        value={changeReason}
                        onChangeText={setChangeReason}
                        mode="outlined"
                        placeholder="e.g., Correction after survey"
                        style={styles.input}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    <GradientButton
                        title={loading ? "Updating..." : "Save Changes"}
                        onPress={handleSubmit}
                        icon="check-circle"
                        disabled={loading || !changeReason}
                        style={{ marginTop: Layout.spacing.sm }}
                    />
                    <Button mode="text" onPress={onDismiss} disabled={loading} style={{ marginTop: Layout.spacing.sm }}>
                        Cancel
                    </Button>
                </ScrollView>
            </Modal>
        </Portal>
    );
};

const Divider = ({ text, style }: { text: string, style?: any }) => (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        <Text variant="labelSmall" style={{ marginHorizontal: 8, color: Colors.textTertiary }}>{text.toUpperCase()}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
    </View>
);

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
    dimensionsBox: {
        backgroundColor: Colors.secondaryContainer + '10',
        padding: 12,
        borderRadius: 8,
        marginBottom: Layout.spacing.md,
    }
});
