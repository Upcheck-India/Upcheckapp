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
import { useUIStore } from '../../store/uiStore';

export const ChemicalLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondId, pondName, cropId } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [ammoniaNh3, setAmmoniaNh3] = useState('');
    const [nitriteNo2, setNitriteNo2] = useState('');
    const [nitrateNo3, setNitrateNo3] = useState('');
    const [alkalinity, setAlkalinity] = useState('');
    const [hardness, setHardness] = useState('');
    const [calciumCa, setCalciumCa] = useState('');
    const [magnesiumMg, setMagnesiumMg] = useState('');
    const [potassium, setPotassium] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);

        try {
            await logResourcesApi.createChemical({
                cropId,
                measurementDate: date,
                measurementTime: time,
                ammoniaNh3Ppm: ammoniaNh3 ? parseFloat(ammoniaNh3) : undefined,
                nitriteNo2Ppm: nitriteNo2 ? parseFloat(nitriteNo2) : undefined,
                nitrateNo3Ppm: nitrateNo3 ? parseFloat(nitrateNo3) : undefined,
                alkalinityPpm: alkalinity ? parseFloat(alkalinity) : undefined,
                hardnessPpm: hardness ? parseFloat(hardness) : undefined,
                calciumCaPpm: calciumCa ? parseFloat(calciumCa) : undefined,
                magnesiumMgPpm: magnesiumMg ? parseFloat(magnesiumMg) : undefined,
                potassiumPpm: potassium ? parseFloat(potassium) : undefined,
            });
            showToast({ message: t('common.savedSuccess'), type: 'success' });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('logs.chemical_errorSave'));
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
                <Text style={styles.title}>{t('logs.chemical_title')}</Text>
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
                    <Text style={styles.sectionTitle}>{t('logs.chemical_nitrogenSection')}</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelAmmoniaNh3')} value={ammoniaNh3} onChangeText={setAmmoniaNh3} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelNitriteNo2')} value={nitriteNo2} onChangeText={setNitriteNo2} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelNitrateNo3')} value={nitrateNo3} onChangeText={setNitrateNo3} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol} />
                    </View>
                </Card>

                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('logs.chemical_mineralsSection')}</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelAlkalinity')} value={alkalinity} onChangeText={setAlkalinity} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelHardness')} value={hardness} onChangeText={setHardness} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelCalcium')} value={calciumCa} onChangeText={setCalciumCa} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('logs.chemical_labelMagnesium')} value={magnesiumMg} onChangeText={setMagnesiumMg} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                    <Input label={t('logs.chemical_labelPotassium')} value={potassium} onChangeText={setPotassium} keyboardType="decimal-pad" placeholder="0.0" />
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
