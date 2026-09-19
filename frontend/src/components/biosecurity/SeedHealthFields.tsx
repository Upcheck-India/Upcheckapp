import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChipGroup } from '../ui/ChipGroup';
import { Input } from '../ui/Input';
import { theme } from '../../theme';
import { PCR_RESULTS, PCR_TESTS, seedWarning, type SeedHealth } from '../../api/biosecurity';

export const EMPTY_SEED: SeedHealth = { plSpf: null, plPcrDate: null, plPcrLab: null, plPcrResults: null };

/** Seed PCR at stocking (D5): SPF, per-test result, lab, date. Warn only. */
export const SeedHealthFields = ({ value, onChange }: { value: SeedHealth; onChange: (v: SeedHealth) => void }) => {
    const { t } = useTranslation();
    const set = (patch: Partial<SeedHealth>) => onChange({ ...value, ...patch });
    const warning = seedWarning(value.plPcrResults);
    return (
        <View>
            <ChipGroup
                label={t('biosecurity.spf')}
                options={[
                    { value: 'yes', label: t('common.yes') },
                    { value: 'no', label: t('common.no') },
                ]}
                value={value.plSpf == null ? null : value.plSpf ? 'yes' : 'no'}
                onChange={(v: string | null) => set({ plSpf: v == null ? null : v === 'yes' })}
            />
            {PCR_TESTS.map((k) => (
                <ChipGroup
                    key={k}
                    label={t(`biosecurity.pcr.${k}`)}
                    options={PCR_RESULTS.map((r) => ({ value: r, label: t(`biosecurity.result.${r}`) }))}
                    value={value.plPcrResults?.[k] ?? null}
                    onChange={(r: string | null) => {
                        const next = { ...(value.plPcrResults ?? {}) } as Record<string, string>;
                        if (r) next[k] = r;
                        else delete next[k];
                        set({ plPcrResults: Object.keys(next).length ? (next as SeedHealth['plPcrResults']) : null });
                    }}
                />
            ))}
            <Input
                label={t('biosecurity.pcrLab')}
                value={value.plPcrLab ?? ''}
                onChangeText={(s: string) => set({ plPcrLab: s || null })}
            />
            <Input
                label={t('biosecurity.pcrDate')}
                value={value.plPcrDate ?? ''}
                onChangeText={(s: string) => set({ plPcrDate: s || null })}
                placeholder="YYYY-MM-DD"
            />
            {warning && (
                <Text
                    testID={`seed-warning-${warning}`}
                    style={[styles.warn, warning === 'positive' && styles.danger]}
                >
                    {t(warning === 'positive' ? 'biosecurity.warnPositive' : 'biosecurity.warnUntested')}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    warn: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.warningText,
        backgroundColor: theme.roles.light.warningBg,
        padding: theme.spacing[3],
        borderRadius: theme.radius.sm,
        marginTop: theme.spacing[2],
    },
    danger: {
        color: theme.roles.light.dangerText,
        backgroundColor: theme.roles.light.dangerBg,
    },
});
