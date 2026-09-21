/**
 * F6: the pond Photos tab — rows grouped by date, thumbnails + what they
 * belong to. A VIEW over records (§2 of the photos spec): tapping a row
 * opens the record, tapping a thumbnail opens the existing PhotoViewerModal
 * (via PhotoStrip, untouched — Phase 5 owns it). Never a browsable album.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { PhotoStrip } from '../../components/ui/PhotoStrip';
import { theme } from '../../theme';
import { photosApi, type PondPhoto } from '../../api/photos';
import { apiErrorMessage } from '../../api/errors';
import { formatDate } from '../../utils/formatDate';

const c = theme.roles.light;

/** Which record screen a row's entity opens, when the app already has one. */
const RECORD_ROUTE: Record<string, (photo: PondPhoto, pondId: string, pondName?: string) => [string, object] | null> = {
    health_observation: () => null, // no dedicated single-record screen today
    mortality: (p, pondId) => ['MortalityHistory', { pondId, cropId: undefined, focusId: p.recordId }],
    disease: (p, pondId) => ['DiseaseHistory', { pondId, cropId: undefined, focusId: p.recordId }],
    treatment: (p, pondId, pondName) => ['TreatmentHistory', { pondId, pondName, focusId: p.recordId }],
    harvest: (p, pondId) => ['HarvestHistory', { pondId, focusId: p.recordId }],
};

const FILTERS = ['all', 'health', 'money', 'inputs', 'pond'] as const;
type Filter = (typeof FILTERS)[number];

interface Section {
    title: string;
    data: PondPhoto[];
}

const groupByDate = (photos: PondPhoto[]): Section[] => {
    const byDay = new Map<string, PondPhoto[]>();
    for (const p of photos) {
        const day = (p.uploadedAt || '').slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(p);
    }
    return [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? 1 : -1))
        .map(([day, data]) => ({ title: formatDate(day, { day: 'numeric', month: 'short', year: 'numeric' }), data }));
};

export const PondPhotosScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName } = route.params;
    const [photos, setPhotos] = useState<PondPhoto[] | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(
        async (isRefresh = false) => {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            try {
                const { data } = await photosApi.feedForPond(pondId, { category: filter === 'all' ? undefined : filter });
                setPhotos(data);
            } catch (e) {
                setError(apiErrorMessage(e, t('photos.tab.loadFailed')));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [pondId, filter, t],
    );

    // Screens stay mounted in React Navigation — refetch on every focus, not just mount.
    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const openRecord = (photo: PondPhoto) => {
        const resolve = photo.entity ? RECORD_ROUTE[photo.entity] : undefined;
        const target = resolve?.(photo, pondId, pondName);
        if (target) navigation.navigate(target[0], target[1]);
    };

    const sections = groupByDate(photos ?? []);

    return (
        <ScreenWrapper>
            <View style={styles.filters}>
                {FILTERS.map((f) => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        style={[styles.chip, filter === f && styles.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: filter === f }}
                    >
                        <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{t(`photos.tab.filters.${f}`)}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator style={styles.center} color={c.primary} />
            ) : error ? (
                <ErrorState message={error} onRetry={() => void load()} />
            ) : sections.length === 0 ? (
                <Text style={styles.empty}>{t('photos.tab.empty')}</Text>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.path}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
                    renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => openRecord(item)} activeOpacity={0.7}>
                            <Card style={styles.row}>
                                <PhotoStrip full={[item.url ?? '']} thumbs={[item.thumbUrl ?? item.url ?? '']} size={56} />
                                <View style={styles.rowText}>
                                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                                    {item.protected && <Text style={styles.protectedBadge}>{t('photos.tab.protectedBadge')}</Text>}
                                </View>
                            </Card>
                        </TouchableOpacity>
                    )}
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: c.surfaceVariant },
    chipActive: { backgroundColor: c.primary },
    chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: c.surface },
    center: { marginTop: 40 },
    empty: { textAlign: 'center', color: c.textSecondary, marginTop: 40 },
    sectionHeader: { fontWeight: '700', color: c.textPrimary, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8, padding: 8 },
    rowText: { flex: 1 },
    title: { color: c.textPrimary, fontWeight: '600' },
    protectedBadge: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
});
