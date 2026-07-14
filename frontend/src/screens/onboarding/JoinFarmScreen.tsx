/**
 * JoinFarmScreen — first-run step for a worker: enter the 8-character farm
 * code (shown to the owner/manager in FarmMembersScreen) to self-serve join
 * a farm as a worker. Reached either as the gated first screen after a
 * worker signs up (pendingFarmJoin, see RootNavigator/authStore), or later
 * from the "no farm yet" empty state on HomeScreen. Skippable either way —
 * a worker with no farm just sees HomeScreen's existing empty state.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { farmMembersApi } from '../../api/farmMembers';
import { useAuthStore } from '../../store/authStore';
import { useMembershipStore } from '../../store/membershipStore';

export const JoinFarmScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const pendingFarmJoin = useAuthStore((s) => s.pendingFarmJoin);
    const completeFarmJoin = useAuthStore((s) => s.completeFarmJoin);
    const loadMemberships = useMembershipStore((s) => s.load);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    const goToApp = () => {
        if (pendingFarmJoin) completeFarmJoin();
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    };

    const join = async () => {
        const value = code.trim().toUpperCase();
        if (!value) return;
        setBusy(true);
        try {
            const { data } = await farmMembersApi.joinFarm(value);
            await loadMemberships();
            Alert.alert(
                t('onboarding.joinFarmSuccessTitle'),
                t('onboarding.joinFarmSuccessSub', { name: data.farm?.name ?? '' }),
                [{ text: t('common.ok', 'OK'), onPress: goToApp }],
            );
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.response?.data?.message ?? t('onboarding.joinFarmError'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={styles.title}>{t('onboarding.joinFarmTitle')}</Text>
                <Text style={styles.subtitle}>{t('onboarding.joinFarmSubtitle')}</Text>
            </View>

            <Card style={styles.card}>
                <Input
                    label={t('onboarding.joinFarmCodeLabel')}
                    value={code}
                    onChangeText={setCode}
                    placeholder={t('onboarding.joinFarmCodePlaceholder')}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    leftIcon="key-outline"
                />
                <Button
                    title={t('onboarding.joinFarmCta')}
                    onPress={join}
                    loading={busy}
                    disabled={code.trim().length !== 8}
                    style={styles.joinBtn}
                />
            </Card>

            <Button
                title={t('onboarding.joinFarmSkip')}
                variant="text"
                onPress={goToApp}
                style={styles.skipBtn}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { marginBottom: theme.spacing[6] },
    title: { ...theme.typeScale.h1, color: theme.roles.light.textPrimary },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginTop: theme.spacing[2] },
    card: { padding: theme.spacing[4] },
    joinBtn: { marginTop: theme.spacing[4] },
    skipBtn: { marginTop: theme.spacing[4] },
});

export default JoinFarmScreen;
