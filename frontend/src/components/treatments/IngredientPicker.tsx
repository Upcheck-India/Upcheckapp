import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { ChipGroup } from '../ui/ChipGroup';
import { AlertBanner } from '../ui/AlertBanner';
import { theme } from '../../theme';
import { useIngredientsStore, ingredientName, searchIngredients, bannedFromIngredients } from '../../features/ingredientsStore';
import { useBannedSubstancesStore } from '../../features/bannedSubstancesStore';
import { findBannedSubstances, type BannedSubstance } from '../../features/bannedSubstances';

const MAX_RESULTS = 12;

/**
 * Active-ingredient picker (disease spec D2): searches every name and alias in
 * all six locales; picked ingredients stay visible as chips. Works offline
 * from the cached catalogue.
 */
export const IngredientPicker = ({
    value,
    onChange,
    category,
    label,
}: {
    value: string[];
    onChange: (keys: string[]) => void;
    category?: string | null;
    label: string;
}) => {
    const { t, i18n } = useTranslation();
    const list = useIngredientsStore((s) => s.ingredients);
    const [query, setQuery] = useState('');

    const options = useMemo(() => {
        const found = searchIngredients(list, query, category).slice(0, MAX_RESULTS);
        const picked = list.filter((i) => value.includes(i.key) && !found.includes(i));
        return [...picked, ...found].map((i) => ({ value: i.key, label: ingredientName(i, i18n.language) }));
    }, [list, query, category, value, i18n.language]);

    return (
        <View style={styles.wrap}>
            {list.length === 0 ? (
                <>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.hint}>{t('compliance.form.noIngredients')}</Text>
                </>
            ) : (
                <>
                    <Input label={label} value={query} onChangeText={setQuery} placeholder={t('compliance.form.searchIngredient')} />
                    <ChipGroup options={options} value={value} onChange={(v: string[]) => onChange(v ?? [])} multiple />
                </>
            )}
        </View>
    );
};

/**
 * What the app can already tell before save: picked ingredients flag exactly
 * (bannedKey); free text goes through the matcher. Mirrors the server.
 */
export const useFlaggedSubstances = (keys: string[], text: string): BannedSubstance[] => {
    const list = useIngredientsStore((s) => s.ingredients);
    const banned = useBannedSubstancesStore((s) => s.substances);
    return useMemo(() => {
        const all = [...bannedFromIngredients(keys, list, banned), ...findBannedSubstances(text, banned)];
        return all.filter((s, i) => all.findIndex((x) => x.name === s.name) === i);
    }, [keys, text, list, banned]);
};

/**
 * The D1/D2 warning, shown the moment an antimicrobial category or a flagged
 * ingredient is picked — before any dose. Warn-only: the save always goes
 * through (DD1). Always carries the "list may be incomplete" line.
 */
export const ComplianceBanner = ({ flagged, antimicrobial }: { flagged: BannedSubstance[]; antimicrobial?: boolean }) => {
    const { t } = useTranslation();
    if (!flagged.length && !antimicrobial) return null;
    const names = flagged.map((s) => s.name).join(', ');
    const banned = flagged.some((s) => s.category === 'banned');
    const [title, message] = banned
        ? [t('logs.treatment_bannerBannedTitle'), t('logs.treatment_bannerBannedMsg', { names })]
        : flagged.length
          ? [t('logs.treatment_bannerRestrictedTitle'), t('logs.treatment_bannerRestrictedMsg', { names })]
          : [t('compliance.banner.antimicrobialTitle'), t('compliance.banner.antimicrobialMsg')];
    return (
        <AlertBanner
            type="warning"
            title={title}
            message={`${message}\n${t('compliance.banner.incomplete')}`}
        />
    );
};

const styles = StyleSheet.create({
    wrap: { marginBottom: theme.spacing[4] },
    label: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[2] },
    hint: { ...theme.typeScale.bodySmall, color: theme.roles.light.textSecondary },
});
