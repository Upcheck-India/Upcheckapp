/**
 * AllWorkersScreen — cross-farm overview. For owners/managers of more than
 * one farm, FarmMembersScreen only ever shows one farm's roster at a time;
 * this screen merges every farm the caller belongs to into one list,
 * grouped by farm, so there's a single place to see the whole team.
 * Read-only here — tapping a farm section jumps to FarmMembersScreen for
 * add/remove/role-change actions, so there's one source of truth for
 * membership management.
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { farmMembersApi, type FarmMember } from '../../api/farmMembers';

interface FarmSection {
    title: string;
    farmId: string;
    data: FarmMember[];
}

const fullName = (m: FarmMember) => {
    const u = m.user;
    if (!u) return m.userId.slice(0, 8);
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.username || m.userId.slice(0, 8);
};

export const AllWorkersScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [sections, setSections] = useState<FarmSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data: mine } = await farmMembersApi.listMine();
            const withFarm = mine.filter((m) => m.farm);
            const results = await Promise.all(
                withFarm.map(async (m) => {
                    try {
                        const { data } = await farmMembersApi.listMembers(m.farmId);
                        return { title: m.farm!.name, farmId: m.farmId, data };
                    } catch {
                        return { title: m.farm!.name, farmId: m.farmId, data: [] as FarmMember[] };
                    }
                }),
            );
            setSections(results.filter((s) => s.data.length > 0));
        } catch {
            setSections([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const renderSectionHeader = ({ section }: { section: FarmSection }) => (
        <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => navigation.navigate('FarmMembers', { farmId: section.farmId, farmName: section.title })}
            activeOpacity={0.7}
        >
            <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
            <View style={styles.sectionRight}>
                <Text style={styles.sectionCount}>{t('members.allFarmMemberCountLabel', { count: section.data.length })}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.roles.light.textDisabled} />
            </View>
        </TouchableOpacity>
    );

    const renderItem = ({ item }: { item: FarmMember }) => (
        <Card style={styles.row}>
            <View style={[styles.avatar, item.role === 'owner' && styles.avatarOwner]}>
                <MaterialCommunityIcons
                    name={item.role === 'owner' ? 'crown' : 'account'}
                    size={20}
                    color={item.role === 'owner' ? theme.roles.light.warningText : theme.roles.light.primary}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{fullName(item)}</Text>
                <Text style={styles.role} numberOfLines={1}>{t(`members.role_${item.role}`)}</Text>
            </View>
        </Card>
    );

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{t('members.allTitle')}</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                ListEmptyComponent={
                    !loading ? <EmptyState icon="account-group-outline" title={t('members.allEmptyTitle')} subtitle={t('members.allEmptySub')} /> : null
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
    backBtn: { padding: theme.spacing[1] },
    title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
    list: { paddingBottom: theme.spacing[6] },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[3], paddingTop: theme.spacing[5],
    },
    sectionTitle: { ...theme.typeScale.h4, color: theme.roles.light.textPrimary, flex: 1, marginRight: theme.spacing[2] },
    sectionRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] },
    sectionCount: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4], marginBottom: theme.spacing[3] },
    avatar: {
        width: 40, height: 40, borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.surfaceVariant, alignItems: 'center', justifyContent: 'center',
    },
    avatarOwner: { backgroundColor: theme.roles.light.warningBg },
    name: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    role: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
});

export default AllWorkersScreen;
