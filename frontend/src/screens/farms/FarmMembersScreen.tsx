/**
 * FarmMembersScreen — owner's team roster for one farm. Lists current members
 * (owner + workers) and lets the owner add a worker (by scanning their profile
 * QR or entering an identifier) or remove one. Workers reach this screen
 * read-only (no add/remove controls).
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';
import { farmMembersApi, type FarmMember, type AssignableRole } from '../../api/farmMembers';
import { usePermissions } from '../../hooks/usePermissions';
import { canManageMember } from '../../permissions/capabilities';

const fullName = (m: FarmMember) => {
    const u = m.user;
    if (!u) return m.userId.slice(0, 8);
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.username || m.userId.slice(0, 8);
};

export const FarmMembersScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { farmId, farmName } = route.params ?? {};
    const [members, setMembers] = useState<FarmMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const perms = usePermissions(farmId);

    const load = useCallback(async () => {
        try {
            const { data } = await farmMembersApi.listMembers(farmId);
            setMembers(data);
        } catch {
            setMembers([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [farmId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const remove = (m: FarmMember) => {
        Alert.alert(
            t('members.removeTitle'),
            t('members.removeConfirm', { name: fullName(m) }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('members.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await farmMembersApi.removeMember(farmId, m.userId);
                            load();
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('members.removeError'));
                        }
                    },
                },
            ],
        );
    };

    const changeRole = (m: FarmMember) => {
        const options: AssignableRole[] = ['manager', 'worker', 'viewer'];
        Alert.alert(t('members.changeRoleTitle', 'Change role'), fullName(m), [
            ...options.map((r) => ({
                text: t(`members.role_${r}`, r),
                onPress: async () => {
                    try {
                        await farmMembersApi.changeRole(farmId, m.userId, r);
                        load();
                    } catch (e: any) {
                        Alert.alert(t('common.error'), e?.response?.data?.message ?? t('members.roleChangeError', 'Could not change role'));
                    }
                },
            })),
            { text: t('common.cancel'), style: 'cancel' as const },
        ]);
    };

    const transfer = (m: FarmMember) => {
        Alert.alert(
            t('members.transferTitle', 'Transfer ownership'),
            t('members.transferConfirm', { name: fullName(m), defaultValue: `Make ${fullName(m)} the owner? You will become a manager.` }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('members.transferCta', 'Transfer'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await farmMembersApi.transferOwnership(farmId, m.userId);
                            load();
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('members.transferError', 'Could not transfer ownership'));
                        }
                    },
                },
            ],
        );
    };

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
            <View style={styles.rowActions}>
                {perms.canChangeRoles && item.role !== 'owner' && (
                    <TouchableOpacity onPress={() => changeRole(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('members.changeRoleTitle', 'Change role')}>
                        <MaterialCommunityIcons name="account-cog-outline" size={22} color={theme.roles.light.primary} />
                    </TouchableOpacity>
                )}
                {perms.canTransferOwnership && item.role !== 'owner' && (
                    <TouchableOpacity onPress={() => transfer(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('members.transferTitle', 'Transfer ownership')}>
                        <MaterialCommunityIcons name="crown-outline" size={22} color={theme.roles.light.warningText} />
                    </TouchableOpacity>
                )}
                {canManageMember(perms.role, item.role) && (
                    <TouchableOpacity onPress={() => remove(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('members.remove')}>
                        <MaterialCommunityIcons name="account-remove-outline" size={22} color={theme.roles.light.dangerText} />
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{t('members.title')}</Text>
                    {farmName ? <Text style={styles.subtitle} numberOfLines={1}>{farmName}</Text> : null}
                </View>
            </View>

            <FlatList
                data={members}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                ListEmptyComponent={
                    !loading ? <EmptyState icon="account-group-outline" title={t('members.emptyTitle')} subtitle={t('members.emptySub')} /> : null
                }
            />

            {perms.canInviteMember && (
                <Button
                    title={t('members.addWorker')}
                    onPress={() => navigation.navigate('AddWorker', { farmId, farmName })}
                    style={styles.addBtn}
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
    backBtn: { padding: theme.spacing[1] },
    title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    list: { paddingBottom: theme.spacing[6], gap: theme.spacing[3] },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4] },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] },
    avatar: {
        width: 40, height: 40, borderRadius: theme.radius.full,
        backgroundColor: theme.roles.light.surfaceVariant, alignItems: 'center', justifyContent: 'center',
    },
    avatarOwner: { backgroundColor: theme.roles.light.warningBg },
    name: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    role: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
    addBtn: { marginTop: theme.spacing[2] },
});

export default FarmMembersScreen;
