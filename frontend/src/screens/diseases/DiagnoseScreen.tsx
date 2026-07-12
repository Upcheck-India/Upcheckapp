import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { theme } from '../../theme';
import { SYMPTOMS, type SymptomCategory } from '../../data/diseaseKnowledge';
import { matchDiseases, type DiseaseMatch } from '../../features/diseaseMatch';
import { diseaseApi } from '../../api/diseases';

const c = theme.roles.light;
const CATEGORIES: SymptomCategory[] = ['physical', 'behavioral', 'environmental'];
const SEVERITY_COLOR: Record<string, string> = {
    high: c.dangerText,
    medium: c.warningText,
    low: c.successText,
};

// Below this, a match is symptom-overlap noise more than a real candidate —
// every result used to render with identical visual weight regardless of
// confidence, so a 12%-confidence guess looked as credible as an 80%-confidence
// one (docs/UI_UX_AUDIT.md Tier 2 #9). Weak matches still show (they may be
// genuinely useful leads for an ambiguous case) but are visually de-emphasized
// and labeled, never hidden — the farmer decides what a "weak" lead is worth.
const WEAK_MATCH_THRESHOLD = 40;

export const DiagnoseScreen = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { pondId, pondName, cropId } = route.params ?? {};
    const [selected, setSelected] = useState<string[]>([]);
    const [results, setResults] = useState<DiseaseMatch[] | null>(null);

    const byCategory = useMemo(() => {
        const map: Record<SymptomCategory, typeof SYMPTOMS> = { physical: [], behavioral: [], environmental: [] };
        SYMPTOMS.forEach((s) => map[s.category].push(s));
        return map;
    }, []);

    const runDiagnosis = () => setResults(matchDiseases(selected));

    const openLibrary = async (m: DiseaseMatch) => {
        try {
            const { data } = await diseaseApi.getAllDiseases();
            const hit = data.find(
                (d) =>
                    d.name?.toLowerCase().includes(m.libraryName.toLowerCase()) ||
                    (d.commonNames ?? []).some((n) => n.toLowerCase().includes(m.libraryName.toLowerCase())),
            );
            if (hit) navigation.navigate('DiseaseDetail', { diseaseId: hit.id });
            else navigation.navigate('DiseaseList');
        } catch {
            navigation.navigate('DiseaseList');
        }
    };

    const reportInPond = () => {
        if (!cropId) return;
        navigation.navigate('DiseaseLog', { pondId, pondName, cropId });
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={c.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('diagnose.title', 'Diagnose')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>{t('diagnose.intro', 'Select the signs you observe to see likely causes.')}</Text>

                {CATEGORIES.map((cat) => (
                    <Card key={cat} style={styles.card}>
                        <Text style={styles.sectionTitle}>{t(`diagnose.cat_${cat}`, cat)}</Text>
                        <ChipGroup
                            multiple
                            value={selected}
                            onChange={setSelected}
                            options={byCategory[cat].map((s) => ({ value: s.id, label: t(s.labelKey, s.label) }))}
                        />
                    </Card>
                ))}

                <Button
                    title={t('diagnose.run', 'Diagnose')}
                    onPress={runDiagnosis}
                    disabled={selected.length === 0}
                    style={styles.runBtn}
                />

                {results && (
                    <View style={styles.results}>
                        <Text style={styles.sectionTitle}>{t('diagnose.results', 'Likely causes')}</Text>
                        {results.length === 0 ? (
                            <Card style={styles.card}>
                                <Text style={styles.empty}>{t('diagnose.noMatch', 'No close match. Consider an expert consultation.')}</Text>
                            </Card>
                        ) : (
                            results.map((m) => {
                                const isWeak = m.confidence < WEAK_MATCH_THRESHOLD;
                                return (
                                    <Card key={m.key} style={[styles.card, isWeak && styles.cardWeak]}>
                                        {isWeak && (
                                            <View style={styles.weakBadge}>
                                                <MaterialCommunityIcons name="help-circle-outline" size={12} color={c.textTertiary} />
                                                <Text style={styles.weakBadgeText}>{t('diagnose.weakMatch', 'Weak match')}</Text>
                                            </View>
                                        )}
                                        <View style={styles.resultRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.resultName, isWeak && styles.textWeak]}>{m.name}</Text>
                                                <Text style={[styles.severity, { color: isWeak ? c.textTertiary : SEVERITY_COLOR[m.severity] }]}>
                                                    {t(`diagnose.sev_${m.severity}`, m.severity)}
                                                </Text>
                                            </View>
                                            <Text style={[styles.confidence, isWeak && styles.textWeak]}>{m.confidence}%</Text>
                                        </View>
                                        <View style={styles.resultActions}>
                                            <Button title={t('diagnose.viewLibrary', 'View')} variant="outlined" onPress={() => openLibrary(m)} style={styles.resultBtn} />
                                            {cropId ? (
                                                <Button title={t('diagnose.report', 'Report in pond')} onPress={reportInPond} style={styles.resultBtn} />
                                            ) : null}
                                        </View>
                                    </Card>
                                );
                            })
                        )}
                        <Text style={styles.disclaimer}>{t('diagnose.disclaimer', 'This is decision support, not a diagnosis. Confirm with an aquaculture expert before treating.')}</Text>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: theme.spacing[4], borderBottomWidth: 1, borderBottomColor: c.borderDefault, backgroundColor: c.surface,
    },
    backBtn: { padding: theme.spacing[4] },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    content: { padding: theme.spacing[4], paddingBottom: theme.spacing[12] },
    intro: { ...theme.typeScale.bodyMedium, color: c.textSecondary, marginBottom: theme.spacing[4] },
    card: { marginBottom: theme.spacing[4], padding: theme.spacing[4] },
    cardWeak: { opacity: 0.7, borderWidth: 1, borderColor: c.borderDefault, borderStyle: 'dashed' },
    weakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: theme.spacing[2] },
    weakBadgeText: { ...theme.typeScale.caption, color: c.textTertiary },
    textWeak: { color: c.textSecondary },
    sectionTitle: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[3] },
    runBtn: { marginTop: theme.spacing[2], marginBottom: theme.spacing[4] },
    results: { marginTop: theme.spacing[2] },
    resultRow: { flexDirection: 'row', alignItems: 'center' },
    resultName: { ...theme.typeScale.bodyLarge, color: c.textPrimary, fontWeight: '600' },
    severity: { ...theme.typeScale.caption, marginTop: 2 },
    confidence: { ...theme.typeScale.numericMedium, color: c.primary },
    resultActions: { flexDirection: 'row', gap: theme.spacing[3], marginTop: theme.spacing[3] },
    resultBtn: { flex: 1 },
    empty: { ...theme.typeScale.bodyMedium, color: c.textSecondary, textAlign: 'center' },
    disclaimer: { ...theme.typeScale.caption, color: c.textTertiary, marginTop: theme.spacing[2] },
});

export default DiagnoseScreen;
