import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { farmsApi } from '../../api/farms';

const WATER_SOURCES: { key: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { key: 'tidal', icon: 'waves' },
    { key: 'river', icon: 'wave' },
    { key: 'borehole', icon: 'pipe' },
    { key: 'reservoir', icon: 'water' },
    { key: 'recycled', icon: 'recycle' },
];

export const CreateFarmScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [totalArea, setTotalArea] = useState('');
    const [waterSource, setWaterSource] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string }>({});

    const detectLocation = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('farms.locationDeniedTitle'), t('farms.locationDeniedMsg'));
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch {
            Alert.alert(t('common.error'), t('farms.locationError'));
        } finally {
            setLocating(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setErrors({ name: t('farms.errorFarmRequired') });
            return;
        }
        setErrors({});
        setIsLoading(true);

        try {
            await farmsApi.create({
                name: name.trim(),
                address: address.trim() || undefined,
                areaHectares: totalArea ? parseFloat(totalArea) : undefined,
                waterSourceType: waterSource ?? undefined,
                latitude: coords?.lat,
                longitude: coords?.lng,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.message || t('farms.errorCreateFarm'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                <Input
                    label={t('farms.fieldFarmName')}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('farms.placeholderFarmName')}
                    error={errors.name}
                    required
                />

                <Input
                    label={t('farms.fieldAddress')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('farms.placeholderAddress')}
                />

                <Input
                    label={t('farms.fieldArea')}
                    value={totalArea}
                    onChangeText={setTotalArea}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                />

                {/* GPS location — unlocks weather, lunar tides & regional pricing. */}
                <Text style={styles.fieldLabel}>{t('farms.fieldLocation')}</Text>
                <TouchableOpacity style={styles.locationBtn} onPress={detectLocation} activeOpacity={0.8} disabled={locating}>
                    <MaterialCommunityIcons
                        name={coords ? 'map-marker-check' : 'crosshairs-gps'}
                        size={20}
                        color={theme.roles.light.primary}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {locating
                            ? t('farms.locating')
                            : coords
                                ? t('farms.locationCaptured', { lat: coords.lat.toFixed(4), lng: coords.lng.toFixed(4) })
                                : t('farms.detectLocation')}
                    </Text>
                </TouchableOpacity>

                {/* Water source — context for water-exchange & quality advice. */}
                <Text style={styles.fieldLabel}>{t('farms.fieldWaterSource')}</Text>
                <View style={styles.sourceRow}>
                    {WATER_SOURCES.map((s) => {
                        const active = waterSource === s.key;
                        return (
                            <TouchableOpacity
                                key={s.key}
                                style={[styles.sourceChip, active && styles.sourceChipActive]}
                                onPress={() => setWaterSource(active ? null : s.key)}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons
                                    name={s.icon}
                                    size={16}
                                    color={active ? theme.roles.light.primary : theme.roles.light.textSecondary}
                                />
                                <Text numberOfLines={1} style={[styles.sourceLabel, active && { color: theme.roles.light.primary }]}>
                                    {t(`farms.water_${s.key}`)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Button
                    title={t('farms.saveFarm')}
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        paddingTop: theme.spacing[4],
    },
    fieldLabel: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[2],
    },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    locationText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, flex: 1 },
    sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    sourceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[1],
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
    },
    sourceChipActive: { borderColor: theme.roles.light.primary, backgroundColor: theme.roles.light.surfaceOverlay },
    sourceLabel: { ...theme.typeScale.labelSmall, color: theme.roles.light.textSecondary, flexShrink: 1 },
    saveBtn: {
        marginTop: theme.spacing[6],
    },
});
