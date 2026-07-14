/**
 * AttendanceScreen — worker self check-in/check-out for one farm, plus
 * (owner/manager only) a same-day roster of everyone's attendance. Check-in
 * goes through the offline sync queue (recordSync.saveRecord) like every
 * other loggable record; check-out is a direct API call (an in-progress
 * shift assumes connectivity by the time it ends, unlike a fresh field log).
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { saveRecord } from '../../sync/recordSync';
import { attendanceApi, type AttendanceRecord } from '../../api/attendance';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { todayLocalISODate } from '../../utils/localDate';

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export const AttendanceScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { farmId, farmName } = route.params ?? {};
    const { user } = useAuthStore();
    const perms = usePermissions(farmId);

    const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
    const [teamToday, setTeamToday] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await attendanceApi.mine(farmId);
            setMyRecords(data);
        } catch {
            setMyRecords([]);
        }
        if (perms.canManageOperations) {
            try {
                const { data } = await attendanceApi.getAll(farmId, todayLocalISODate());
                setTeamToday(data);
            } catch {
                setTeamToday([]);
            }
        }
        setLoading(false);
        setRefreshing(false);
    }, [farmId, perms.canManageOperations]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const openRecord = myRecords.find((r) => !r.checkOutAt) ?? null;

    const checkIn = async () => {
        setBusy(true);
        try {
            const res = await saveRecord({
                entity: 'attendance',
                endpoint: '/attendance/check-in',
                payload: { farmId },
            });
            Alert.alert(
                t('attendance.checkedInTitle'),
                res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('attendance.checkedInSub'),
            );
            load();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('attendance.checkInError'));
        } finally {
            setBusy(false);
        }
    };

    const checkOut = async () => {
        if (!openRecord) return;
        setBusy(true);
        try {
            await attendanceApi.checkOut(openRecord.id);
            Alert.alert(t('attendance.checkedOutTitle'), t('attendance.checkedOutSub'));
            load();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('attendance.checkOutError'));
        } finally {
            setBusy(false);
        }
    };

    const renderMine = ({ item }: { item: AttendanceRecord }) => (
        <Card style={styles.row}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={theme.roles.light.primary} />
            <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>
                    {t('attendance.checkInAt', { time: formatTime(item.checkInAt) })}
                </Text>
                <Text style={styles.rowSubtext}>
                    {item.checkOutAt
                        ? t('attendance.checkOutAt', { time: formatTime(item.checkOutAt) })
                        : t('attendance.stillCheckedIn')}
                </Text>
            </View>
        </Card>
    );

    const renderTeam = ({ item }: { item: AttendanceRecord }) => (
        <Card style={styles.row}>
            <MaterialCommunityIcons
                name={item.userId === user?.id ? 'account' : 'account-outline'}
                size={20}
                color={theme.roles.light.textSecondary}
            />
            <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{formatTime(item.checkInAt)}</Text>
                <Text style={styles.rowSubtext}>
                    {item.checkOutAt ? formatTime(item.checkOutAt) : t('attendance.stillCheckedIn')}
                </Text>
            </View>
        </Card>
    );

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{t('attendance.title')}</Text>
                    {farmName ? <Text style={styles.subtitle} numberOfLines={1}>{farmName}</Text> : null}
                </View>
            </View>

            <FlatList
                data={myRecords}
                keyExtractor={(r) => r.id}
                renderItem={renderMine}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                ListHeaderComponent={
                    <>
                        <Card style={styles.statusCard}>
                            <Text style={styles.statusLabel}>
                                {openRecord
                                    ? t('attendance.checkInAt', { time: formatTime(openRecord.checkInAt) })
                                    : t('attendance.notCheckedIn')}
                            </Text>
                            <Button
                                title={openRecord ? t('attendance.checkOutCta') : t('attendance.checkInCta')}
                                onPress={openRecord ? checkOut : checkIn}
                                loading={busy}
                                style={styles.actionBtn}
                            />
                        </Card>

                        {perms.canManageOperations && (
                            <>
                                <Text style={styles.sectionTitle}>{t('attendance.teamTodayTitle')}</Text>
                                {teamToday.length === 0 && !loading ? (
                                    <Text style={styles.emptyTeamText}>{t('attendance.teamTodayEmpty')}</Text>
                                ) : (
                                    teamToday.map((item) => <View key={item.id}>{renderTeam({ item })}</View>)
                                )}
                            </>
                        )}
                        <Text style={styles.sectionTitle}>{t('attendance.myHistoryTitle')}</Text>
                    </>
                }
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], padding: theme.spacing[4], paddingBottom: 0 },
    backBtn: { padding: theme.spacing[1] },
    title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary },
    list: { padding: theme.spacing[4], gap: theme.spacing[3] },
    statusCard: { padding: theme.spacing[5], alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[4] },
    statusLabel: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary, fontWeight: '600' },
    actionBtn: { alignSelf: 'stretch' },
    sectionTitle: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary, marginBottom: theme.spacing[2], marginTop: theme.spacing[2] },
    emptyTeamText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[3] },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[3], marginBottom: theme.spacing[2] },
    rowText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    rowSubtext: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
});

export default AttendanceScreen;
