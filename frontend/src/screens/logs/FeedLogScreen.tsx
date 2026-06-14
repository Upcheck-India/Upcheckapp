import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { feedApi } from '../../api/feedRecords';
import { useUIStore } from '../../store/uiStore';

export const FeedLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fasting, setFasting] = useState(false);

    // Tray percentages (for tracking leftovers)
    const [tray1, setTray1] = useState('');
    const [tray2, setTray2] = useState('');
    const [tray3, setTray3] = useState('');
    const [tray4, setTray4] = useState('');

    const [totalFeed, setTotalFeed] = useState('');
    const [feedType, setFeedType] = useState('Pellet Starter');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!fasting) {
            if (!totalFeed || isNaN(parseFloat(totalFeed))) {
                Alert.alert(t('common.error'), t('logs.feed_validationFeedAmount'));
                return;
            }
        }

        setIsLoading(true);

        // Convert tray states to a note string
        let combinedNotes = notes;
        if (tray1 || tray2 || tray3 || tray4) {
            combinedNotes = `Trays leftovers: [1: ${tray1 || 0}%, 2: ${tray2 || 0}%, 3: ${tray3 || 0}%, 4: ${tray4 || 0}%]. ${notes}`.trim();
        }

        try {
            await feedApi.create({
                pondId,
                feedType: feedType.trim() || 'Pellet',
                quantityKg: fasting ? 0 : parseFloat(totalFeed),
                feedingTime: date,
                notes: combinedNotes || undefined,
            });
            showToast({ message: t('common.savedSuccess'), type: 'success' });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('logs.feed_errorSave'));
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
                <Text style={styles.title}>{t('logs.feed_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>

                <Card style={styles.card}>
                    <View style={styles.fastingRow}>
                        <View>
                            <Text style={styles.sectionTitle}>{t('logs.feed_fastingDayTitle')}</Text>
                            <Text style={styles.labelDesc}>{t('logs.feed_fastingDayDesc')}</Text>
                        </View>
                        <Switch
                            value={fasting}
                            onValueChange={setFasting}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.infoBg }}
                            thumbColor={fasting ? theme.roles.light.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.dateInput, { marginTop: theme.spacing[4] }]}>
                        <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />
                    </View>
                </Card>

                {!fasting && (
                    <>
                        <Card style={styles.card}>
                            <Text style={styles.sectionTitle}>{t('logs.feed_sectionFeedingAmount')}</Text>
                            <Input
                                label={t('logs.feed_labelTotalFeed')}
                                value={totalFeed}
                                onChangeText={setTotalFeed}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                required
                            />
                            <Input
                                label={t('logs.feed_labelFeedType')}
                                value={feedType}
                                onChangeText={setFeedType}
                                placeholder={t('logs.feed_placeholderFeedType')}
                            />
                        </Card>

                        <Card style={styles.card}>
                            <Text style={styles.sectionTitle}>{t('logs.feed_sectionFeedingTrays')}</Text>
                            <Text style={styles.labelDesc}>{t('logs.feed_trayDesc')}</Text>

                            <View style={styles.trayGrid}>
                                <View style={styles.trayItem}>
                                    <Input label={t('logs.feed_labelTray1')} value={tray1} onChangeText={setTray1} keyboardType="number-pad" placeholder="0%" />
                                </View>
                                <View style={styles.trayItem}>
                                    <Input label={t('logs.feed_labelTray2')} value={tray2} onChangeText={setTray2} keyboardType="number-pad" placeholder="0%" />
                                </View>
                            </View>
                            <View style={styles.trayGrid}>
                                <View style={styles.trayItem}>
                                    <Input label={t('logs.feed_labelTray3')} value={tray3} onChangeText={setTray3} keyboardType="number-pad" placeholder="0%" />
                                </View>
                                <View style={styles.trayItem}>
                                    <Input label={t('logs.feed_labelTray4')} value={tray4} onChangeText={setTray4} keyboardType="number-pad" placeholder="0%" />
                                </View>
                            </View>
                        </Card>
                    </>
                )}

                <Card style={styles.card}>
                    <Input
                        label={t('logs.feed_labelNotesBehavior')}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder={t('logs.feed_placeholderNotesBehavior')}
                        multiline
                        numberOfLines={3}
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
        marginBottom: 4,
    },
    labelDesc: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[3],
    },
    fastingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateInput: {
        paddingTop: theme.spacing[4],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
    },
    trayGrid: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    trayItem: {
        flex: 1,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[8],
    },
});
