import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Modal, Portal, TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';
import { GradientButton } from './GradientButton';
import { MapBoundaryPicker } from './MapBoundaryPicker';

interface AddPondModalProps {
    visible: boolean;
    onDismiss: () => void;
    onSubmit: (data: any) => Promise<void>;
    loading: boolean;
}

export const AddPondModal: React.FC<AddPondModalProps> = ({ visible, onDismiss, onSubmit, loading }) => {
    const [namePrefix, setNamePrefix] = useState('P');
    const [displayName, setDisplayName] = useState('');
    const [batchCount, setBatchCount] = useState('1');
    const [geometryType, setGeometryType] = useState('rectangular');
    const [constructionType, setConstructionType] = useState('earthen');

    // Dimensions
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [diameter, setDiameter] = useState('');
    const [depth, setDepth] = useState('1.5');
    const [boundary, setBoundary] = useState<{ latitude: number, longitude: number }[] | undefined>();
    const [mapVisible, setMapVisible] = useState(false);

    const handleSumbit = async () => {
        const data = {
            namePrefix,
            displayName: displayName || undefined,
            batchCount: parseInt(batchCount) || 1,
            geometryType,
            constructionType,
            lengthM: length ? parseFloat(length) : undefined,
            widthM: width ? parseFloat(width) : undefined,
            diameterM: diameter ? parseFloat(diameter) : undefined,
            depthM: parseFloat(depth) || 1.5,
            boundary,
        };
        await onSubmit(data);
    };

    const isRectangular = geometryType === 'rectangular' || geometryType === 'raceway';
    const isCircular = geometryType === 'circular';

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text variant="titleMedium" style={styles.modalTitle}>Add New Pond</Text>

                    <View style={styles.row}>
                        <TextInput
                            label="Prefix"
                            value={namePrefix}
                            onChangeText={setNamePrefix}
                            mode="outlined"
                            style={[styles.input, { flex: 0.3 }]}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                        <TextInput
                            label="Display Name (Opt)"
                            value={displayName}
                            onChangeText={setDisplayName}
                            mode="outlined"
                            style={[styles.input, { flex: 0.65 }]}
                            outlineColor={Colors.border}
                            activeOutlineColor={Colors.primary}
                        />
                    </View>

                    <TextInput
                        label="Batch Count (1-50)"
                        value={batchCount}
                        onChangeText={setBatchCount}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                        outlineColor={Colors.border}
                        activeOutlineColor={Colors.primary}
                    />

                    <Text variant="labelMedium" style={styles.sectionLabel}>Geometry Type</Text>
                    <SegmentedButtons
                        value={geometryType}
                        onValueChange={setGeometryType}
                        buttons={[
                            { value: 'rectangular', label: 'Rect', icon: 'shape-rectangle-plus' },
                            { value: 'circular', label: 'Circ', icon: 'shape-circle-plus' },
                            { value: 'raceway', label: 'Race', icon: 'reproduction' },
                        ]}
                        style={styles.segmented}
                    />

                    <Text variant="labelMedium" style={styles.sectionLabel}>Construction</Text>
                    <SegmentedButtons
                        value={constructionType}
                        onValueChange={setConstructionType}
                        buttons={[
                            { value: 'earthen', label: 'Earth' },
                            { value: 'lined', label: 'Lined' },
                            { value: 'biofloc_ras', label: 'Biofloc/RAS' },
                        ]}
                        style={styles.segmented}
                    />

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
                    </View>

                    <View style={styles.mapSection}>
                        <Button
                            mode="outlined"
                            icon={boundary ? "map-check" : "map-marker-plus"}
                            onPress={() => setMapVisible(true)}
                            textColor={boundary ? Colors.success : Colors.primary}
                            style={{ borderColor: boundary ? Colors.success : Colors.primary }}
                        >
                            {boundary ? "Boundary Defined" : "Set Map Boundary"}
                        </Button>
                        {boundary && (
                            <HelperText type="info" style={{ textAlign: 'center' }}>
                                GPS data will be saved for this pond.
                            </HelperText>
                        )}
                    </View>

                    <GradientButton
                        title={loading ? "Creating..." : (parseInt(batchCount) > 1 ? `Create ${batchCount} Ponds` : "Create Pond")}
                        onPress={handleSumbit}
                        icon="plus-circle"
                        disabled={loading}
                        style={{ marginTop: Layout.spacing.sm }}
                    />
                    <Button mode="text" onPress={onDismiss} disabled={loading} style={{ marginTop: Layout.spacing.sm }}>
                        Cancel
                    </Button>
                </ScrollView>
                <MapBoundaryPicker
                    visible={mapVisible}
                    onDismiss={() => setMapVisible(false)}
                    onSave={(b) => {
                        setBoundary(b);
                        setMapVisible(false);
                    }}
                    initialBoundary={boundary}
                />
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
    dimensionsBox: {
        backgroundColor: Colors.secondaryContainer + '20',
        padding: 12,
        borderRadius: 8,
        marginBottom: Layout.spacing.md,
    },
    mapSection: {
        marginBottom: Layout.spacing.md,
        alignItems: 'center',
    }
});
