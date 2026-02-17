import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text, Button, IconButton, Surface } from 'react-native-paper';
import { Colors } from '../constants/Colors';

interface MapBoundaryPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onSave: (boundary: { latitude: number, longitude: number }[]) => void;
    initialBoundary?: { latitude: number, longitude: number }[];
    initialLocation?: { latitude: number, longitude: number };
}

export const MapBoundaryPicker: React.FC<MapBoundaryPickerProps> = ({
    visible,
    onDismiss,
    onSave,
    initialBoundary = [],
    initialLocation = { latitude: -6.200000, longitude: 106.816666 }, // Default center
}) => {
    const [boundary, setBoundary] = useState<{ latitude: number, longitude: number }[]>(initialBoundary);
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

    const handleMapPress = (e: any) => {
        const { coordinate } = e.nativeEvent;
        setBoundary([...boundary, coordinate]);
    };

    const undoLast = () => {
        setBoundary(boundary.slice(0, -1));
    };

    const clearAll = () => {
        setBoundary([]);
    };

    const handleSave = () => {
        onSave(boundary);
    };

    return (
        <Modal visible={visible} onRequestClose={onDismiss} animationType="slide">
            <View style={styles.container}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    mapType={mapType}
                    initialRegion={{
                        ...initialLocation,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }}
                    onPress={handleMapPress}
                >
                    {boundary.length > 0 && (
                        <Polygon
                            coordinates={boundary}
                            fillColor="rgba(33, 150, 243, 0.4)"
                            strokeColor={Colors.primary}
                            strokeWidth={2}
                        />
                    )}
                    {boundary.map((coord, index) => (
                        <Marker
                            key={`vertex-${index}`}
                            coordinate={coord}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={styles.vertex} />
                        </Marker>
                    ))}
                </MapView>

                {/* Overlays */}
                <Surface style={styles.topBar} elevation={4}>
                    <IconButton icon="close" onPress={onDismiss} size={20} />
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Draw Boundary</Text>
                    <IconButton
                        icon={mapType === 'satellite' ? 'image-filter-hdr' : 'satellite-variant'}
                        onPress={() => setMapType(mapType === 'satellite' ? 'standard' : 'satellite')}
                        size={20}
                    />
                </Surface>

                <View style={styles.bottomActions}>
                    <Surface style={styles.controls} elevation={4}>
                        <View style={{ flexDirection: 'row' }}>
                            <Button mode="text" onPress={undoLast} disabled={boundary.length === 0} icon="undo" compact>Undo</Button>
                            <Button mode="text" onPress={clearAll} disabled={boundary.length === 0} icon="delete-outline" compact>Clear</Button>
                        </View>
                        <Button mode="contained" onPress={handleSave} style={styles.saveBtn} textColor="white">Save</Button>
                    </Surface>
                </View>

                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>Tap points to form a polygon</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    topBar: {
        position: 'absolute',
        top: 20,
        left: 15,
        right: 15,
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: Colors.surface,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        borderRadius: 15,
        backgroundColor: Colors.surface,
    },
    saveBtn: { borderRadius: 10, backgroundColor: Colors.primary },
    vertex: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    hintContainer: {
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hintText: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: 'white',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 11,
        overflow: 'hidden',
    }
});
