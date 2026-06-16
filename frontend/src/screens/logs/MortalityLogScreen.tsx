import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { Stepper } from '../../components/ui/Stepper';
import { saveRecord } from '../../sync/recordSync';
import { useUIStore } from '../../store/uiStore';

export const MortalityLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState(0);
    const [estimatedWeightKg, setEstimatedWeightKg] = useState('');
    const [note, setNote] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (quantity < 0) {
            Alert.alert(t('common.error'), t('logs.mortality_validationQuantity'));
            return;
        }

        setIsLoading(true);

        try {
            const res = await saveRecord({
                entity: 'mortality',
                endpoint: '/mortality',
                payload: {
                    cropId,
                    recordDate: date,
                    quantity,
                    estimatedWeightKg: estimatedWeightKg ? parseFloat(estimatedWeightKg) : undefined,
                    note: note.trim() || undefined,
                },
            });
            showToast({
                message: res.queued
                    ? t('common.savedOffline', 'Saved — will sync when online')
                    : t('common.savedSuccess'),
                type: 'success',
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('logs.mortality_errorSave'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('logs.mortality_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>

                <Card style={styles.card}>
                    <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />
                    <Stepper
                        label={t('logs.mortality_labelQuantity')}
                        value={quantity}
                        onChange={setQuantity}
                        min={0}
                    />
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.mortality_sectionWeight')}</Text>
                    <Input
                        label={t('logs.mortality_labelEstWeight')}
                        value={estimatedWeightKg}
                        onChangeText={setEstimatedWeightKg}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label={t('logs.mortality_labelObservations')}
                        value={note}
                        onChangeText={setNote}
                        placeholder={t('logs.mortality_placeholderObservations')}
                        multiline
                        numberOfLines={4}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title={t('logs.saveRecord')}
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
});
