import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { pondsApi } from '../../api/ponds';

type GeometryType = 'rectangular' | 'circular' | 'irregular' | 'raceway';
type ConstructionType = 'earthen' | 'lined' | 'cage' | 'biofloc_ras';

export const CreatePondScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { farmId } = route.params;

    const CONSTRUCTION_TYPES: { value: ConstructionType; label: string; icon: string }[] = [
        { value: 'earthen', label: t('ponds.constructionEarthen'), icon: 'terrain' },
        { value: 'lined', label: t('ponds.constructionLined'), icon: 'texture-box' },
        { value: 'cage', label: t('ponds.constructionCage'), icon: 'cube-outline' },
        { value: 'biofloc_ras', label: t('ponds.constructionBioflocRas'), icon: 'recycle' },
    ];
    const [namePrefix, setNamePrefix] = useState('');
    const [geometryType, setGeometryType] = useState<GeometryType>('rectangular');
    const [constructionType, setConstructionType] = useState<ConstructionType>('earthen');
    const [lengthM, setLengthM] = useState('');
    const [widthM, setWidthM] = useState('');
    const [diameterM, setDiameterM] = useState('');
    const [depthM, setDepthM] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [computedArea, setComputedArea] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ namePrefix?: string; depthM?: string }>({});

    useEffect(() => {
        let area = 0;
        if (geometryType === 'rectangular' || geometryType === 'raceway') {
            const l = parseFloat(lengthM) || 0;
            const w = parseFloat(widthM) || 0;
            area = l * w;
        } else if (geometryType === 'circular') {
            const d = parseFloat(diameterM) || 0;
            const r = d / 2;
            area = Math.PI * r * r;
        }
        setComputedArea(area);
    }, [geometryType, lengthM, widthM, diameterM]);

    const handleSave = async () => {
        const newErrors: { namePrefix?: string; depthM?: string } = {};
        if (!namePrefix.trim() || namePrefix.trim().length > 4) {
            newErrors.namePrefix = t('ponds.errorNamePrefix');
        }
        if (!depthM || parseFloat(depthM) < 0.5 || parseFloat(depthM) > 5.0) {
            newErrors.depthM = t('ponds.errorDepth');
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        setIsLoading(true);

        try {
            await pondsApi.create({
                farmId,
                namePrefix: namePrefix.trim(),
                geometryType,
                constructionType,
                lengthM: (geometryType === 'rectangular' || geometryType === 'raceway') && lengthM ? parseFloat(lengthM) : undefined,
                widthM: (geometryType === 'rectangular' || geometryType === 'raceway') && widthM ? parseFloat(widthM) : undefined,
                diameterM: geometryType === 'circular' && diameterM ? parseFloat(diameterM) : undefined,
                depthM: parseFloat(depthM),
                displayName: displayName.trim() || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('ponds.errorCreatePond'));
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
                <Text style={styles.headerTitle}>{t('ponds.addPond')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Input
                    label={t('ponds.fieldNamePrefix')}
                    value={namePrefix}
                    onChangeText={setNamePrefix}
                    placeholder={t('ponds.placeholderNamePrefix')}
                    error={errors.namePrefix}
                    required
                />

                <Input
                    label={t('ponds.fieldDisplayName')}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t('ponds.placeholderDisplayName')}
                />

                <Text style={styles.label}>{t('ponds.labelPondShape')}</Text>
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, geometryType === 'rectangular' && styles.toggleActive]}
                        onPress={() => setGeometryType('rectangular')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="rectangle-outline"
                            size={22}
                            color={geometryType === 'rectangular' ? theme.roles.light.primary : theme.roles.light.textSecondary}
                        />
                        <Text style={[styles.toggleText, geometryType === 'rectangular' && styles.toggleTextActive]}>{t('ponds.shapeRect')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, geometryType === 'circular' && styles.toggleActive]}
                        onPress={() => setGeometryType('circular')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="circle-outline"
                            size={22}
                            color={geometryType === 'circular' ? theme.roles.light.primary : theme.roles.light.textSecondary}
                        />
                        <Text style={[styles.toggleText, geometryType === 'circular' && styles.toggleTextActive]}>{t('ponds.shapeCircular')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, geometryType === 'raceway' && styles.toggleActive]}
                        onPress={() => setGeometryType('raceway')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="arrow-right-bold-outline"
                            size={22}
                            color={geometryType === 'raceway' ? theme.roles.light.primary : theme.roles.light.textSecondary}
                        />
                        <Text style={[styles.toggleText, geometryType === 'raceway' && styles.toggleTextActive]}>{t('ponds.shapeRaceway')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>{t('ponds.labelConstructionType')}</Text>
                <View style={styles.toggleRow}>
                    {CONSTRUCTION_TYPES.map((ct) => (
                        <TouchableOpacity
                            key={ct.value}
                            style={[styles.toggleBtn, constructionType === ct.value && styles.toggleActive]}
                            onPress={() => setConstructionType(ct.value)}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name={ct.icon as any}
                                size={20}
                                color={constructionType === ct.value ? theme.roles.light.primary : theme.roles.light.textSecondary}
                            />
                            <Text style={[styles.toggleText, constructionType === ct.value && styles.toggleTextActive, { fontSize: 11 }]}>{ct.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {(geometryType === 'rectangular' || geometryType === 'raceway') ? (
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label={t('ponds.fieldLength')} value={lengthM} onChangeText={setLengthM} keyboardType="decimal-pad" placeholder={t('ponds.placeholderDecimal')} />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label={t('ponds.fieldWidth')} value={widthM} onChangeText={setWidthM} keyboardType="decimal-pad" placeholder={t('ponds.placeholderDecimal')} />
                        </View>
                    </View>
                ) : geometryType === 'circular' ? (
                    <Input label={t('ponds.fieldDiameter')} value={diameterM} onChangeText={setDiameterM} keyboardType="decimal-pad" placeholder={t('ponds.placeholderDecimal')} />
                ) : null}

                <Input
                    label={t('ponds.fieldDepth')}
                    value={depthM}
                    onChangeText={setDepthM}
                    keyboardType="decimal-pad"
                    placeholder={t('ponds.placeholderDepth')}
                    error={errors.depthM}
                    required
                />

                <Card style={styles.previewCard} variant="flat">
                    <Text style={styles.previewLabel}>{t('ponds.computedArea')}</Text>
                    <Text style={styles.previewValue}>{computedArea > 0 ? computedArea.toFixed(2) : '0.00'} m²</Text>
                </Card>

                <Button
                    title={t('ponds.savePond')}
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
        backgroundColor: theme.roles.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    headerTitle: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    label: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[2],
    },
    toggleRow: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: theme.spacing[3],
        backgroundColor: theme.roles.light.surface,
        borderWidth: 1.5,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.md,
    },
    toggleActive: {
        borderColor: theme.roles.light.primary,
        backgroundColor: theme.roles.light.infoBg,
    },
    toggleText: {
        ...theme.typeScale.labelSmall,
        color: theme.roles.light.textSecondary,
    },
    toggleTextActive: {
        color: theme.roles.light.primary,
    },
    previewCard: {
        alignItems: 'center',
        paddingVertical: theme.spacing[6],
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
    previewLabel: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: 4,
    },
    previewValue: {
        ...theme.typeScale.h2,
        color: theme.roles.light.primary,
    },
    saveBtn: {
        marginTop: theme.spacing[4],
    },
});
