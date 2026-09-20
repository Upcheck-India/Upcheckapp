import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import { Icon } from './Icon';
import { STATES, districtsForState, findState, findDistrict, type LgdDistrict } from '../../data/lgdLocations';

/**
 * State → district picker (spec 2026-09-20 compliance C0.2,
 * docs/strategy/farm-location-strategy.md Option B). No permission needed —
 * this is a static, committed list, not a GPS read. Shows the district name,
 * never raw coordinates.
 *
 * Two-step, same "inline expansion, search past a threshold" shape as
 * PondPicker: pick a state first (36 options, no search needed), then a
 * district (up to ~75 for UP — search past 8).
 */

const SEARCH_THRESHOLD = 8;

export interface DistrictPickerProps {
    stateCode: string | null;
    districtCode: string | null;
    onChange: (stateCode: string | null, districtCode: string | null) => void;
}

export const DistrictPicker: React.FC<DistrictPickerProps> = ({ stateCode, districtCode, onChange }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState<'state' | 'district' | null>(null);
    const [query, setQuery] = useState('');

    const selectedState = findState(stateCode);
    const selectedDistrict = findDistrict(districtCode);

    const districts = useMemo(
        () => (stateCode ? districtsForState(stateCode) : []),
        [stateCode],
    );

    const filteredStates = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? STATES.filter((s) => s.name.toLowerCase().includes(q)) : STATES;
    }, [query]);

    const filteredDistricts = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? districts.filter((d) => d.name.toLowerCase().includes(q)) : districts;
    }, [districts, query]);

    const chooseState = (code: string) => {
        setQuery('');
        // Changing state invalidates any previously chosen district.
        onChange(code, null);
        setOpen('district');
    };

    const chooseDistrict = (d: LgdDistrict) => {
        setQuery('');
        onChange(stateCode, d.code);
        setOpen(null);
    };

    const label = selectedDistrict
        ? `${selectedDistrict.name}, ${selectedState?.name ?? ''}`
        : selectedState
            ? t('farms.districtPickerChooseDistrict')
            : t('farms.districtPickerPlaceholder');

    return (
        <View>
            <TouchableOpacity
                style={styles.field}
                onPress={() => setOpen(selectedState ? 'district' : 'state')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('farms.fieldDistrict')}
            >
                <Icon name="location_on" size={20} color={theme.roles.light.primary} />
                <Text style={styles.fieldText} numberOfLines={1}>{label}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.roles.light.textTertiary} />
            </TouchableOpacity>

            {open && (
                <View style={styles.list}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>
                            {open === 'state' ? t('farms.districtPickerChooseState') : t('farms.districtPickerChooseDistrict')}
                        </Text>
                        {open === 'district' && (
                            <TouchableOpacity onPress={() => { setQuery(''); setOpen('state'); }} accessibilityRole="button">
                                <Text style={styles.changeState}>{selectedState?.name} · {t('farms.districtPickerChange')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {((open === 'state' && STATES.length > SEARCH_THRESHOLD) ||
                        (open === 'district' && districts.length > SEARCH_THRESHOLD)) && (
                        <View style={styles.searchBox}>
                            <MaterialCommunityIcons name="magnify" size={20} color={theme.roles.light.textTertiary} />
                            <TextInput
                                style={styles.searchInput}
                                value={query}
                                onChangeText={setQuery}
                                placeholder={t('common.search')}
                                placeholderTextColor={theme.roles.light.textTertiary}
                                autoCorrect={false}
                                accessibilityLabel={t('common.search')}
                            />
                        </View>
                    )}

                    {(open === 'state' ? filteredStates : filteredDistricts).map((item: any) => (
                        <TouchableOpacity
                            key={item.code}
                            style={styles.option}
                            onPress={() => (open === 'state' ? chooseState(item.code) : chooseDistrict(item))}
                            accessibilityRole="button"
                        >
                            <Text style={styles.optionLabel} numberOfLines={1}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                    {(open === 'state' ? filteredStates : filteredDistricts).length === 0 && (
                        <Text style={styles.empty}>{t('farms.districtPickerNoResults')}</Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        minHeight: 48,
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderStrong,
        backgroundColor: theme.roles.light.surface,
    },
    fieldText: { ...theme.typeScale.labelLarge, color: theme.roles.light.textPrimary, flex: 1 },
    list: {
        marginTop: theme.spacing[2],
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.md,
        maxHeight: 260,
        overflow: 'hidden',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[3],
        paddingTop: theme.spacing[2],
    },
    listTitle: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
    changeState: { ...theme.typeScale.labelSmall, color: theme.roles.light.textBrand },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginHorizontal: theme.spacing[3],
        marginVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.xs,
        minHeight: 44,
    },
    searchInput: { flex: 1, ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, paddingVertical: 0 },
    option: {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[2.5],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.surfaceVariant,
        minHeight: 44,
        justifyContent: 'center',
    },
    optionLabel: { ...theme.typeScale.bodyLarge, color: theme.roles.light.textPrimary },
    empty: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textTertiary,
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[3],
    },
});

export default DistrictPicker;
