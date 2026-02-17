import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Avatar, Chip, Divider, List, ActivityIndicator, useTheme, Button, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { PondService } from '../../services/pondService';
import { Pond, PondDimensionHistory } from '../../types/database';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader';
import * as Haptics from 'expo-haptics';
import { EditDimensionsModal } from '../../components/EditDimensionsModal';
import { GradientButton } from '../../components/GradientButton';
import { MapBoundaryPicker } from '../../components/MapBoundaryPicker';
import { StartCycleModal } from '../../components/StartCycleModal';
import { CropsService } from '../../services/cropsService';
import { Crop } from '../../types/database';

const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(new Date(date));
};

const PondDetailScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { pondId } = route.params;
    const theme = useTheme();

    const [pond, setPond] = useState<Pond | null>(null);
    const [history, setHistory] = useState<PondDimensionHistory[]>([]);
    const [activeCycle, setActiveCycle] = useState<Crop | undefined>();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [mapPickerVisible, setMapPickerVisible] = useState(false);
    const [startCycleVisible, setStartCycleVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadData();
    }, [pondId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pondData, historyData] = await Promise.all([
                PondService.fetchPondById(pondId),
                PondService.fetchDimensionHistory(pondId)
            ]);
            setPond(pondData);
            setHistory(historyData);

            if (pondData.activeCycleId) {
                const cycle = await CropsService.fetchActiveCrop(pondId);
                setActiveCycle(cycle);
            } else {
                setActiveCycle(undefined);
            }
        } catch (error) {
            console.error('Error loading pond details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDimensions = async (updates: any) => {
        setUpdating(true);
        try {
            await PondService.updatePond(pondId, updates);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditModalVisible(false);
            setMapPickerVisible(false);
            loadData();
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Update Failed', error.message || 'Could not update.');
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveBoundary = (boundary: { latitude: number, longitude: number }[]) => {
        // Use the first point as the pin location if not already set
        const updates: any = { boundary };
        if (boundary.length > 0 && (!pond?.gpsLat || !pond?.gpsLng)) {
            updates.gpsLat = boundary[0].latitude;
            updates.gpsLng = boundary[0].longitude;
        }
        handleUpdateDimensions(updates);
    };

    const handleArchivePond = () => {
        if (!pond) return;
        if (pond.activeCycleId) {
            Alert.alert('Cannot Archive', 'Please close the active cycle before archiving this pond.');
            return;
        }
        Alert.alert(
            'Archive Pond',
            'Archive this pond? You can still view its history later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await PondService.archivePond(pondId);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            navigation.goBack();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleCycleStarted = () => {
        setStartCycleVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return Colors.success;
            case 'fallow': return Colors.grey;
            case 'harvesting': return Colors.warning;
            case 'archived': return Colors.error;
            default: return Colors.textTertiary;
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (!pond) {
        return (
            <View style={styles.center}>
                <Text>Pond not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                title={pond.displayName || pond.name}
                subtitle={pond.pondCode || 'Registry Details'}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                {/* ─── Overview Card ─────────────────────────────────── */}
                <AppCard style={styles.card}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text variant="titleLarge" style={styles.title}>{pond.displayName || pond.name}</Text>
                            <Text variant="bodySmall" style={styles.subtitle}>{pond.pondCode}</Text>
                        </View>
                        <Chip
                            style={[styles.chip, { backgroundColor: getStatusColor(pond.status) + '20' }]}
                            textStyle={{ color: getStatusColor(pond.status), fontWeight: '700' }}
                        >
                            {pond.status.toUpperCase()}
                        </Chip>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text variant="labelSmall" style={styles.label}>GEOMETRY</Text>
                            <Text variant="bodyMedium" style={styles.value}>{pond.geometryType.toUpperCase()}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text variant="labelSmall" style={styles.label}>CONSTRUCTION</Text>
                            <Text variant="bodyMedium" style={styles.value}>{pond.constructionType.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <Button
                            mode="outlined"
                            icon="pencil"
                            onPress={() => setEditModalVisible(true)}
                            compact
                            style={styles.actionButton}
                        >
                            Edit Dimensions
                        </Button>
                        <Button
                            mode="text"
                            icon="archive"
                            onPress={handleArchivePond}
                            textColor={Colors.error}
                            compact
                        >
                            Archive
                        </Button>
                    </View>
                </AppCard>

                {/* ─── Active Cycle ─────────────────────────────────── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Production Cycle</Text>
                    <Button
                        mode="text"
                        compact
                        onPress={() => navigation.navigate('CycleManagement', { pondId: pond.id, pondName: pond.displayName || pond.name })}
                    >
                        History
                    </Button>
                </View>
                {activeCycle ? (
                    <AppCard style={styles.card}>
                        <View style={styles.headerRow}>
                            <View>
                                <Text variant="titleMedium" style={styles.title}>{activeCycle.name}</Text>
                                <Text variant="bodySmall" style={styles.subtitle}>Started {formatDate(activeCycle.stockingDate || '')}</Text>
                            </View>
                            <Chip style={{ backgroundColor: Colors.primary + '20' }} textStyle={{ color: Colors.primary, fontWeight: '700' }}>
                                DOC {activeCycle.doc}
                            </Chip>
                        </View>

                        <Divider style={styles.divider} />

                        <View style={styles.grid}>
                            <View style={styles.gridItem}>
                                <Text variant="labelSmall" style={styles.label}>SPECIES</Text>
                                <Text variant="bodyMedium" style={styles.value}>{activeCycle.speciesType?.toUpperCase()}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text variant="labelSmall" style={styles.label}>STOCKING</Text>
                                <Text variant="bodyMedium" style={styles.value}>{activeCycle.stockingCount?.toLocaleString()} pcs</Text>
                            </View>
                        </View>

                        <Button
                            mode="outlined"
                            textColor={Colors.error}
                            style={{ borderColor: Colors.error, marginTop: Layout.spacing.sm }}
                            onPress={() => Alert.alert('Coming Soon', 'Harvest/Close cycle flow in next task')}
                        >
                            Close Cycle
                        </Button>
                    </AppCard>
                ) : (
                    <AppCard style={styles.card}>
                        <EmptyState
                            icon="fish"
                            title="No Active Cycle"
                            subtitle="Start a new cultivation cycle to track production."
                            actionLabel="Start Cycle"
                            onAction={() => setStartCycleVisible(true)}
                        />
                    </AppCard>
                )}

                {/* ─── Location & Map ─────────────────────────────── */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Location & Map</Text>
                <AppCard style={styles.card}>
                    <View style={styles.headerRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Avatar.Icon icon="map-marker-radius" size={24} style={{ backgroundColor: 'transparent' }} color={Colors.primary} />
                            <Text variant="bodyLarge" style={{ marginLeft: 8, fontWeight: '600' }}>GPS Boundaries</Text>
                        </View>
                        <Button
                            mode="contained-tonal"
                            onPress={() => setMapPickerVisible(true)}
                            compact
                            style={{ borderRadius: 8 }}
                        >
                            {pond.boundary?.length ? 'Update Map' : 'Set Boundary'}
                        </Button>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text variant="labelSmall" style={styles.label}>LATITUDE</Text>
                            <Text variant="bodyMedium" style={styles.value}>{pond.gpsLat?.toFixed(6) || 'N/A'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text variant="labelSmall" style={styles.label}>LONGITUDE</Text>
                            <Text variant="bodyMedium" style={styles.value}>{pond.gpsLng?.toFixed(6) || 'N/A'}</Text>
                        </View>
                    </View>

                    {pond.boundary?.length ? (
                        <View style={styles.statusBox}>
                            <Avatar.Icon icon="check-circle" size={20} color={Colors.success} style={{ backgroundColor: 'transparent' }} />
                            <Text variant="bodySmall" style={{ color: Colors.success, marginLeft: 4 }}>
                                Boundary defined with {pond.boundary.length} vertices
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusBox}>
                            <Avatar.Icon icon="alert-circle-outline" size={20} color={Colors.warning} style={{ backgroundColor: 'transparent' }} />
                            <Text variant="bodySmall" style={{ color: Colors.warning, marginLeft: 4 }}>
                                No physical boundary defined on map
                            </Text>
                        </View>
                    )}
                </AppCard>

                {/* ─── Dimensions & Metrics ───────────────────────────── */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Physical Metrics</Text>
                <View style={styles.metricsRow}>
                    <View style={styles.metricCard}>
                        <Avatar.Icon icon="ruler-square" size={32} style={styles.metricIcon} color={Colors.primary} />
                        <Text variant="labelSmall" style={styles.metricLabel}>AREA</Text>
                        <Text variant="titleMedium" style={styles.metricValue}>{pond.calculatedAreaM2} m²</Text>
                        {pond.overrideAreaM2 && (
                            <Text variant="bodySmall" style={styles.overrideText}>Override: {pond.overrideAreaM2} m²</Text>
                        )}
                    </View>
                    <View style={styles.metricCard}>
                        <Avatar.Icon icon="database" size={32} style={styles.metricIcon} color={Colors.secondary} />
                        <Text variant="labelSmall" style={styles.metricLabel}>VOLUME</Text>
                        <Text variant="titleMedium" style={styles.metricValue}>
                            {Math.round((pond.overrideAreaM2 ?? pond.calculatedAreaM2) * pond.depthM * 100) / 100} m³
                        </Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Avatar.Icon icon="arrow-collapse-down" size={32} style={styles.metricIcon} color={Colors.warning} />
                        <Text variant="labelSmall" style={styles.metricLabel}>DEPTH</Text>
                        <Text variant="titleMedium" style={styles.metricValue}>{pond.depthM} m</Text>
                    </View>
                </View>

                {/* ─── Dimension History ─────────────────────────────── */}
                <Text variant="titleMedium" style={styles.sectionTitle}>Dimension History</Text>
                <AppCard>
                    {history.length === 0 ? (
                        <Text style={styles.emptyText}>No changes recorded yet.</Text>
                    ) : (
                        history.map((record, index) => (
                            <React.Fragment key={record.id}>
                                <List.Item
                                    title={`Changed on ${formatDate(record.changedAt)}`}
                                    description={record.changeReason || 'No reason provided'}
                                    left={props => <List.Icon {...props} icon="history" />}
                                    right={() => (
                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <Text variant="labelSmall" style={{ color: Colors.textSecondary }}>PREV AREA</Text>
                                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                                {record.overrideAreaM2Before ?? record.calculatedAreaM2Before} m²
                                            </Text>
                                        </View>
                                    )}
                                />
                                {index < history.length - 1 && <Divider />}
                            </React.Fragment>
                        ))
                    )}
                </AppCard>

                <View style={{ height: 40 }} />
            </ScrollView>

            {pond.status !== 'archived' && (
                <>
                    <EditDimensionsModal
                        visible={editModalVisible}
                        onDismiss={() => setEditModalVisible(false)}
                        onSubmit={handleUpdateDimensions}
                        loading={updating}
                        pond={pond}
                    />
                    <MapBoundaryPicker
                        visible={mapPickerVisible}
                        onDismiss={() => setMapPickerVisible(false)}
                        onSave={handleSaveBoundary}
                        initialBoundary={pond.boundary}
                        initialLocation={pond.gpsLat ? { latitude: pond.gpsLat, longitude: pond.gpsLng! } : undefined}
                    />
                    <StartCycleModal
                        visible={startCycleVisible}
                        onDismiss={() => setStartCycleVisible(false)}
                        onSubmit={handleCycleStarted}
                        pond={pond}
                    />
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: Layout.spacing.lg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginBottom: Layout.spacing.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontWeight: 'bold', color: Colors.text },
    subtitle: { color: Colors.textSecondary },
    chip: { height: 28 },
    divider: { marginVertical: Layout.spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: '50%', marginBottom: Layout.spacing.sm },
    label: { color: Colors.textTertiary, letterSpacing: 1 },
    value: { fontWeight: '600', color: Colors.textSecondary },
    actionRow: { flexDirection: 'row', marginTop: Layout.spacing.md, gap: 8 },
    actionButton: { flex: 1 },
    sectionTitle: { marginBottom: Layout.spacing.md, marginTop: Layout.spacing.sm, fontWeight: '700', color: Colors.primary },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.lg },
    metricCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 12,
        width: '31%',
        alignItems: 'center',
        elevation: 2,
    },
    metricIcon: { backgroundColor: 'transparent' },
    metricLabel: { color: Colors.textTertiary, marginTop: 4 },
    metricValue: { fontWeight: 'bold', marginTop: 2 },
    overrideText: { fontSize: 10, color: Colors.success, marginTop: 2 },
    emptyText: { textAlign: 'center', padding: 20, color: Colors.textTertiary },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 8,
        backgroundColor: Colors.background,
        borderRadius: 8
    },
});

export default PondDetailScreen;
