import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { logResourcesApi } from '../../api/logResources';

export const PlanktonLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [greenAlgae, setGreenAlgae] = useState('');
    const [blueGreenAlgae, setBlueGreenAlgae] = useState('');
    const [diatom, setDiatom] = useState('');
    const [dinoflagellata, setDinoflagellata] = useState('');
    const [protozoa, setProtozoa] = useState('');
    const [floc, setFloc] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);

        try {
            await logResourcesApi.createPlankton({
                cropId,
                measurementDate: date,
                measurementTime: time,
                greenAlgaeGaCellMl: greenAlgae ? parseFloat(greenAlgae) : undefined,
                blueGreenAlgaeBgaCellMl: blueGreenAlgae ? parseFloat(blueGreenAlgae) : undefined,
                diatomCellMl: diatom ? parseFloat(diatom) : undefined,
                dinoflagellataCellMl: dinoflagellata ? parseFloat(dinoflagellata) : undefined,
                protozoaCellMl: protozoa ? parseFloat(protozoa) : undefined,
                flocCellMl: floc ? parseFloat(floc) : undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('logs.plankton_errorSave'));
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
                <Text style={styles.title}>{t('logs.plankton_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>

                <Card style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.time')} value={time} onChangeText={setTime} placeholder={t('logs.timePlaceholder')} required />
                        </View>
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.plankton_sectionCounts')}</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelGreenAlgae')} value={greenAlgae} onChangeText={setGreenAlgae} keyboardType="number-pad" placeholder="0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelBlueGreen')} value={blueGreenAlgae} onChangeText={setBlueGreenAlgae} keyboardType="number-pad" placeholder="0" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelDiatom')} value={diatom} onChangeText={setDiatom} keyboardType="number-pad" placeholder="0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelDinoflagellata')} value={dinoflagellata} onChangeText={setDinoflagellata} keyboardType="number-pad" placeholder="0" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelProtozoa')} value={protozoa} onChangeText={setProtozoa} keyboardType="number-pad" placeholder="0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.plankton_labelFloc')} value={floc} onChangeText={setFloc} keyboardType="number-pad" placeholder="0" />
                        </View>
                    </View>
                </Card>

                <Button title={t('logs.saveRecord')} onPress={handleSave} loading={isLoading} style={styles.saveBtn} />
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
    saveBtn: {
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
});
