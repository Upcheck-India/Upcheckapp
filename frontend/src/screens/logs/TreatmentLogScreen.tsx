import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SelectField } from '../../components/ui/SelectField';
import { MoltPeakBanner } from '../../components/molt/MoltPeakBanner';
import { IngredientPicker, useFlaggedSubstances, ComplianceBanner } from '../../components/treatments/IngredientPicker';
import { theme } from '../../theme';
import type { Treatment, BannedFlag } from '../../api/treatments';
import { inventoryApi, type InventoryItem } from '../../api/inventory';
import { apiErrorMessage } from '../../api/errors';
import { useUIStore } from '../../store/uiStore';
import { todayLocalISODate } from '../../utils/localDate';
import { saveRecord } from '../../sync/recordSync';

export const CATEGORIES = ['mineral', 'lime_alkalinity', 'probiotic', 'disinfectant', 'oxidiser_oxygen', 'water_conditioner', 'feed_additive', 'antiparasitic', 'antimicrobial', 'other'];
export const REASONS = ['molt_prep', 'water_quality', 'disease', 'prevention', 'pond_prep', 'other'];
const UNITS = ['kg', 'g', 'l', 'ml', 'ppm', 'kg_per_ha'];
const FLAG_RANK: Record<BannedFlag, number> = { none: 0, restricted: 1, banned: 2 };
const FLAG_REASONS = ['typing_error', 'wrong_product', 'other'];

/** Inventory unit ('L', 'mL', 'kg') → dose unit, or null when a dose can't be drawn in it. */
const doseUnitOf = (unit?: string) => {
    const u = (unit ?? '').toLowerCase();
    return UNITS.includes(u) ? u : null;
};

/**
 * Treatment entry (disease spec D2): category → active ingredient(s) from the
 * cached 6-locale catalogue → product → dose + unit → why. A free-text "other
 * ingredient" row stays and is still matched against the banned list.
 *
 * Route params: pondId, pondName, cropId, farmId?, editRecord?,
 * prefill?: 'molt' (from the molt checklist), diseaseRecordId? (from a disease record).
 */
export const TreatmentLogScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const showToast = useUIStore((s) => s.showToast);
    const { pondName, cropId, farmId, prefill, diseaseRecordId } = route.params;
    const editRecord: Treatment | undefined = route.params.editRecord;
    const isEditing = !!editRecord;

    const [date, setDate] = useState(editRecord?.treatmentDate ? editRecord.treatmentDate.slice(0, 10) : todayLocalISODate());
    const [category, setCategory] = useState<string | null>(editRecord?.category ?? (prefill === 'molt' ? 'mineral' : null));
    const [ingredientKeys, setIngredientKeys] = useState<string[]>(editRecord?.ingredientKeys ?? []);
    const [productName, setProductName] = useState(editRecord?.productName ?? '');
    // The "other ingredient" free text is the description column (old rows: their whole text).
    const [other, setOther] = useState(editRecord?.description ?? '');
    const initialDose = editRecord?.doseValue ?? editRecord?.dosageKg;
    const [dose, setDose] = useState(initialDose != null ? String(initialDose) : '');
    const [doseUnit, setDoseUnit] = useState<string>(editRecord?.doseUnit ?? 'kg');
    const [reason, setReason] = useState<string | null>(
        editRecord?.reason ?? (prefill === 'molt' ? 'molt_prep' : diseaseRecordId ? 'disease' : null),
    );
    const [notes, setNotes] = useState(editRecord?.notes ?? '');
    const [stock, setStock] = useState<InventoryItem[]>([]);
    const [stockItemId, setStockItemId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // "Use from stock": medicine/chemical items of this farm. Online-only
    // convenience; offline the list is simply empty.
    useEffect(() => {
        if (isEditing || !farmId) return;
        inventoryApi
            .getAll(farmId)
            .then(({ data }) => setStock((data ?? []).filter((i) => i.category === 'medicine' || i.category === 'chemical')))
            .catch(() => setStock([]));
    }, [farmId, isEditing]);

    const flagged = useFlaggedSubstances(ingredientKeys, `${productName} ${other} ${notes}`);
    const hasBanned = flagged.some((s) => s.category === 'banned');
    const newFlag: BannedFlag = hasBanned ? 'banned' : flagged.length ? 'restricted' : 'none';

    const doseNum = parseFloat(dose);
    const stockMatches = useMemo(() => {
        const p = productName.trim().toLowerCase();
        return stock
            .filter(
                (i) =>
                    (p && (i.name.toLowerCase().includes(p) || p.includes(i.name.toLowerCase()))) ||
                    (i.ingredientKeys ?? []).some((k) => ingredientKeys.includes(k)),
            )
            .filter((i) => doseUnitOf(i.unit) === doseUnit)
            .slice(0, 3);
    }, [stock, productName, ingredientKeys, doseUnit]);
    const chosenStock = stockMatches.find((i) => i.id === stockItemId) ?? null;

    const performSave = async (flagChangeReason?: string) => {
        setIsLoading(true);
        const payload: Record<string, unknown> = {
            treatmentDate: date,
            description: other.trim(),
            basedOn: productName.trim() ? 'product_usage' : 'written_notes',
            ...(category ? { category } : {}),
            ingredientKeys,
            productName: productName.trim(),
            ...(reason ? { reason } : {}),
            ...(Number.isFinite(doseNum) ? { doseValue: doseNum, doseUnit } : {}),
            notes: notes.trim(),
            ...(diseaseRecordId ? { diseaseRecordId } : {}),
        };

        try {
            // Edits ride the offline queue too (they used to be online-only).
            const res = isEditing
                ? await saveRecord({
                      entity: 'treatment',
                      endpoint: `/treatments/${editRecord!.id}`,
                      method: 'PATCH',
                      payload: { id: editRecord!.id, ...payload, ...(flagChangeReason ? { flagChangeReason } : {}) },
                  })
                : await saveRecord({
                      entity: 'treatment',
                      endpoint: '/treatments',
                      payload: {
                          cropId,
                          ...payload,
                          ...(chosenStock && doseNum > 0 ? { inventoryItemId: chosenStock.id } : {}),
                      },
                  });
            showToast({
                message: res.queued ? t('common.savedOffline', 'Saved — will sync when online') : t('common.savedSuccess'),
                type: 'success',
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert(t('common.error'), apiErrorMessage(error, t('logs.treatment_errorSave')));
        } finally {
            setIsLoading(false);
        }
    };

    /** Lowering a flag is never silent: ask why (D3.3). */
    const askFlagReason = () => {
        const oldFlag = editRecord?.bannedSubstanceFlag ?? 'none';
        if (FLAG_RANK[newFlag] >= FLAG_RANK[oldFlag]) return void performSave();
        Alert.alert(
            t('compliance.flagChange.title'),
            t('compliance.flagChange.body', { names: (editRecord?.bannedSubstanceMatches ?? []).join(', ') }),
            [
                ...FLAG_REASONS.map((r) => ({ text: t(`compliance.flagChange.${r}`), onPress: () => void performSave(r) })),
                { text: t('common.cancel'), style: 'cancel' as const },
            ],
        );
    };

    const handleSave = () => {
        if (!category && !ingredientKeys.length && !productName.trim() && !other.trim()) {
            Alert.alert(t('common.error'), t('compliance.form.needSomething'));
            return;
        }
        if (flagged.length > 0) {
            const names = flagged.map((s) => s.name).join(', ');
            Alert.alert(
                hasBanned ? t('logs.treatment_bannedTitle') : t('logs.treatment_restrictedTitle'),
                hasBanned ? t('logs.treatment_bannedBody', { names }) : t('logs.treatment_restrictedBody', { names }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('logs.treatment_saveAnyway'), style: 'destructive', onPress: askFlagReason },
                ],
            );
            return;
        }
        askFlagReason();
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{isEditing ? t('logs.editTitle', 'Edit Reading') : t('logs.treatment_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.subtitle}>{t('logs.loggingFor', { pondName })}</Text>
                <MoltPeakBanner messageKey="logs.moltPeakTreatment" />

                <ComplianceBanner flagged={flagged} antimicrobial={category === 'antimicrobial'} />

                <Card style={styles.card}>
                    <Input label={t('common.date')} value={date} onChangeText={setDate} placeholder={t('logs.datePlaceholder')} required />
                    <SelectField
                        label={t('compliance.form.type')}
                        value={category}
                        options={CATEGORIES.map((c) => ({ value: c, label: t(`compliance.category.${c}`) }))}
                        onSelect={(c) => setCategory(c)}
                        placeholder={t('compliance.form.typePlaceholder')}
                    />
                    <Input
                        label={t('compliance.form.product')}
                        value={productName}
                        onChangeText={setProductName}
                        placeholder={t('logs.treatment_placeholderProductName')}
                    />
                    <IngredientPicker
                        label={t('compliance.form.active')}
                        value={ingredientKeys}
                        onChange={setIngredientKeys}
                        category={category}
                    />
                    <Input
                        label={t('compliance.form.other')}
                        value={other}
                        onChangeText={setOther}
                        placeholder={t('compliance.form.otherPlaceholder')}
                    />
                </Card>

                <Card style={styles.card}>
                    <Input label={t('compliance.form.dose')} value={dose} onChangeText={setDose} keyboardType="decimal-pad" placeholder="0" />
                    <ChipGroup
                        options={UNITS.map((u) => ({ value: u, label: t(`compliance.unit.${u}`) }))}
                        value={doseUnit}
                        onChange={(u: string | null) => u && setDoseUnit(u)}
                    />
                    {stockMatches.length > 0 && (
                        <ChipGroup
                            label={t('compliance.stock.title')}
                            options={stockMatches.map((i) => ({
                                value: i.id,
                                label: t('compliance.stock.use', { name: i.name, qty: Number(i.quantity), unit: i.unit ?? '' }),
                            }))}
                            value={stockItemId}
                            onChange={(id: string | null) => setStockItemId(id)}
                        />
                    )}
                    <ChipGroup
                        label={t('compliance.form.why')}
                        options={REASONS.map((r) => ({ value: r, label: t(`compliance.reason.${r}`) }))}
                        value={reason}
                        onChange={(r: string | null) => setReason(r)}
                    />
                </Card>

                <Card style={styles.card}>
                    <Input
                        label={t('logs.treatment_labelAdditionalNotes')}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder={t('logs.treatment_placeholderNotes')}
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title={isEditing ? t('logs.updateBtn', 'Update') : t('logs.saveRecord')}
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
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    subtitle: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textSecondary, marginBottom: theme.spacing[4] },
    card: { marginBottom: theme.spacing[6] },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: { marginTop: theme.spacing[3], marginBottom: theme.spacing[8] },
});
