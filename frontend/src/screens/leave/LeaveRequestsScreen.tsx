/**
 * LeaveRequestsScreen — worker submits/views their own leave requests for one
 * farm; owner/manager additionally see and act on pending requests from
 * everyone. Submission goes through the offline sync queue (recordSync.
 * saveRecord) like every other loggable record; approve/reject are direct
 * API calls (a manager acting on a request assumes connectivity).
 */
import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { saveRecord } from '../../sync/recordSync';
import { leaveRequestsApi, type LeaveRequest } from '../../api/leaveRequests';
import { usePermissions } from '../../hooks/usePermissions';
import { todayLocalISODate } from '../../utils/localDate';

const c = theme.roles.light;

const STATUS_META: Record<string, { color: string; icon: string }> = {
    pending: { color: c.warningText, icon: 'clock-outline' },
    approved: { color: c.successText, icon: 'check-circle' },
    rejected: { color: c.dangerText, icon: 'close-circle' },
};

export const LeaveRequestsScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { farmId, farmName } = route.params ?? {};
    const perms = usePermissions(farmId);

    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [pending, setPending] = useState<LeaveRequest[]>([]);
    const [startDate, setStartDate] = useState(todayLocalISODate());
    const [endDate, setEndDate] = useState(todayLocalISODate());
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await leaveRequestsApi.mine(farmId);
            setMyRequests(data);
        } catch {
            setMyRequests([]);
        }
        if (perms.canManageOperations) {
            try {
                const { data } = await leaveRequestsApi.getAll(farmId, 'pending');
                setPending(data);
            } catch {
                setPending([]);
            }
        }
    }, [farmId, perms.canManageOperations]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const submit = async () => {
        if (endDate < startDate) {
            Alert.alert(t('common.error'), t('leave.errorDateRange'));
            return;
        }
        setSubmitting(true);
        try {
            const res = await saveRecord({
                entity: 'leave_request',
                endpoint: '/leave-requests',
                payload: { farmId, startDate, endDate, reason: reason.trim() || undefined },
            });
            Alert.alert(
                t('leave.submittedTitle'),
                res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('leave.submittedSub'),
            );
            setReason('');
            load();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('leave.submitError'));
        } finally {
            setSubmitting(false);
        }
    };

    const decide = async (request: LeaveRequest, approve: boolean) => {
        try {
            if (approve) await leaveRequestsApi.approve(request.id);
            else await leaveRequestsApi.reject(request.id);
            load();
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('leave.decideError'));
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{t('leave.title')}</Text>
                    {farmName ? <Text style={styles.subtitle} numberOfLines={1}>{farmName}</Text> : null}
                </View>
            </View>

            <Card style={styles.formCard}>
                <Text style={styles.formTitle}>{t('leave.requestFormTitle')}</Text>
                <Input label={t('leave.startDateLabel')} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
                <Input label={t('leave.endDateLabel')} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
                <Input label={t('leave.reasonLabel')} value={reason} onChangeText={setReason} placeholder={t('leave.reasonPlaceholder')} />
                <Button title={t('leave.submitCta')} onPress={submit} loading={submitting} style={styles.submitBtn} />
            </Card>

            {perms.canManageOperations && (
                <>
                    <Text style={styles.sectionTitle}>{t('leave.pendingTitle')}</Text>
                    {pending.length === 0 ? (
                        <Text style={styles.emptyText}>{t('leave.pendingEmpty')}</Text>
                    ) : (
                        pending.map((r) => (
                            <Card key={r.id} style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowText}>{t('leave.dateRange', { start: r.startDate, end: r.endDate })}</Text>
                                    {r.reason ? <Text style={styles.rowSubtext}>{r.reason}</Text> : null}
                                </View>
                                <View style={styles.decideActions}>
                                    <TouchableOpacity onPress={() => decide(r, true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('leave.approve')}>
                                        <MaterialCommunityIcons name="check-circle-outline" size={24} color={c.successText} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => decide(r, false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('leave.reject')}>
                                        <MaterialCommunityIcons name="close-circle-outline" size={24} color={c.dangerText} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        ))
                    )}
                </>
            )}

            <Text style={styles.sectionTitle}>{t('leave.myRequestsTitle')}</Text>
            {myRequests.length === 0 ? (
                <Text style={styles.emptyText}>{t('leave.myRequestsEmpty')}</Text>
            ) : (
                myRequests.map((r) => {
                    const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                    return (
                        <Card key={r.id} style={styles.row}>
                            <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowText}>{t('leave.dateRange', { start: r.startDate, end: r.endDate })}</Text>
                                <Text style={[styles.rowSubtext, { color: meta.color }]}>{t(`leave.status_${r.status}`)}</Text>
                            </View>
                        </Card>
                    );
                })
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[4] },
    backBtn: { padding: theme.spacing[1] },
    title: { ...theme.typeScale.h1, color: c.textPrimary },
    subtitle: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    formCard: { padding: theme.spacing[4], marginBottom: theme.spacing[5] },
    formTitle: { ...theme.typeScale.h3, color: c.textPrimary, marginBottom: theme.spacing[3] },
    submitBtn: { marginTop: theme.spacing[3] },
    sectionTitle: { ...theme.typeScale.h3, color: c.textPrimary, marginBottom: theme.spacing[2], marginTop: theme.spacing[2] },
    emptyText: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginBottom: theme.spacing[4] },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[3], marginBottom: theme.spacing[2] },
    rowText: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    rowSubtext: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    decideActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] },
});

export default LeaveRequestsScreen;
