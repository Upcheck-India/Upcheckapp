import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { pondsApi } from '../../api/ponds';

const c = theme.roles.light;

interface DimRow {
    id: string;
    changedAt?: string;
    changeReason?: string | null;
    lengthMBefore?: number | null;
    widthMBefore?: number | null;
    depthMBefore?: number | null;
    calculatedAreaM2Before?: number | null;
}

const fmt = (n?: number | null) => (n == null ? '—' : Number(n).toString());

export const PondDimensionHistoryScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName } = route.params ?? {};
    const [rows, setRows] = useState<DimRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        pondsApi
            .getDimensionHistory(pondId)
            .then(({ data }) => {
                // Backend may return a flat array or a paged { data: [] } shape.
                const list = Array.isArray(data) ? data : data?.data ?? [];
                setRows(list);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [pondId]);

    const renderItem = ({ item }: { item: DimRow }) => (
        <Card style={styles.card}>
            <Text style={styles.date}>
                {item.changedAt ? new Date(item.changedAt).toLocaleString() : t('ponds.dimChange', 'Dimension change')}
            </Text>
            <Text style={styles.dims}>
                {t('ponds.dimBefore', 'Before')}: L {fmt(item.lengthMBefore)}m · W {fmt(item.widthMBefore)}m · D {fmt(item.depthMBefore)}m · {fmt(item.calculatedAreaM2Before)} m²
            </Text>
            {item.changeReason ? <Text style={styles.reason}>{item.changeReason}</Text> : null}
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                    {pondName ? t('ponds.dimHistoryFor', { name: pondName, defaultValue: `Dimension history · ${pondName}` }) : t('ponds.dimHistory', 'Dimension history')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(r) => r.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.content}
                    ListEmptyComponent={
                        <EmptyState icon="history" title={t('ponds.dimHistoryEmptyTitle', 'No changes yet')} subtitle={t('ponds.dimHistoryEmptySub', "This pond's dimensions haven't been edited.")} />
                    }
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary, flex: 1, textAlign: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    card: { marginBottom: theme.spacing[3], padding: theme.spacing[4] },
    date: { ...theme.typeScale.labelMedium, color: c.textPrimary, marginBottom: theme.spacing[1] },
    dims: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    reason: { ...theme.typeScale.caption, color: c.textTertiary, marginTop: theme.spacing[1] },
});

export default PondDimensionHistoryScreen;
