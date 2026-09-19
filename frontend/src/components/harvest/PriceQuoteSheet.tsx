/**
 * "Today's buyer quote" (harvest-and-molt H5.1). Rows start from the farm's
 * last quote, on the counts it actually sells, so the farmer only edits what
 * moved. One POST, online-only: a quote is not loggable pond data, so it is
 * not queued — offline says so plainly instead of pretending to save.
 */
import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import { useSyncStore } from '../../store/syncStore';
import { apiErrorMessage } from '../../api/errors';
import {
    priceQuotesApi, quoteRows, rowsToBands, type CurrentQuote,
} from '../../api/priceQuotes';

const c = theme.roles.light;

interface Props {
    farmId: string | undefined;
    visible: boolean;
    onClose: () => void;
    /** After a successful save. */
    onSaved?: () => void;
}

export const PriceQuoteSheet = ({ farmId, visible, onClose, onSaved }: Props) => {
    const { t } = useTranslation();
    const online = useSyncStore((s) => s.isConnected);
    const [current, setCurrent] = useState<CurrentQuote | null>(null);
    const [rows, setRows] = useState<{ count: string; price: string }[]>([]);
    const [buyer, setBuyer] = useState('');
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible || !farmId) return;
        setError(null);
        setLoading(true);
        priceQuotesApi
            .current(farmId)
            .then(({ data }) => {
                setCurrent(data);
                setRows(quoteRows(data));
                setBuyer(data.quote?.buyer ?? '');
            })
            .catch(() => {
                setCurrent(null);
                setRows(quoteRows(null));
            })
            .finally(() => setLoading(false));
    }, [visible, farmId]);

    if (!visible) return null;

    const setRow = (i: number, key: 'count' | 'price', v: string) =>
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

    const save = async () => {
        const bands = rowsToBands(rows);
        if (!bands.length) {
            setError(t('engines.quote.invalid'));
            return;
        }
        if (!farmId) return;
        setBusy(true);
        setError(null);
        try {
            await priceQuotesApi.create(farmId, { bands, ...(buyer.trim() ? { buyer: buyer.trim() } : {}) });
            onSaved?.();
            onClose();
        } catch (e: any) {
            setError(e?.response ? apiErrorMessage(e, t('engines.common.tryAgain')) : t('engines.quote.offline'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable onPress={() => {}}>
                    <Card style={styles.sheet}>
                        <Text style={styles.title}>{t('engines.quote.title')}</Text>
                        <Text style={styles.sub}>
                            {current?.quote
                                ? t('engines.quote.lastQuote', { date: current.quote.quotedOn, days: current.ageDays ?? 0 })
                                : t('engines.quote.subtitle')}
                        </Text>
                        {!online && (
                            <Text style={styles.warn} accessibilityRole="alert" testID="quote-offline">
                                {t('engines.quote.offline')}
                            </Text>
                        )}
                        {loading ? (
                            <ActivityIndicator color={c.primary} />
                        ) : (
                            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                                <View style={styles.row}>
                                    <Text style={[styles.head, styles.cell]}>{t('engines.quote.count')}</Text>
                                    <Text style={[styles.head, styles.cell]}>{t('engines.quote.price')}</Text>
                                </View>
                                {rows.map((r, i) => (
                                    <View style={styles.row} key={i}>
                                        <TextInput
                                            style={[styles.input, styles.cell]}
                                            value={r.count}
                                            onChangeText={(v) => setRow(i, 'count', v)}
                                            keyboardType="numeric"
                                            testID={`quote-count-${i}`}
                                        />
                                        <TextInput
                                            style={[styles.input, styles.cell]}
                                            value={r.price}
                                            onChangeText={(v) => setRow(i, 'price', v)}
                                            keyboardType="decimal-pad"
                                            placeholder="₹"
                                            placeholderTextColor={c.textTertiary}
                                            testID={`quote-price-${i}`}
                                        />
                                    </View>
                                ))}
                                <TouchableOpacity
                                    onPress={() => setRows((rs) => [...rs, { count: '', price: '' }])}
                                    accessibilityRole="button"
                                    style={styles.addRow}
                                >
                                    <Text style={styles.link}>+ {t('engines.quote.addRow')}</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    value={buyer}
                                    onChangeText={setBuyer}
                                    placeholder={t('engines.quote.buyer')}
                                    placeholderTextColor={c.textTertiary}
                                />
                            </ScrollView>
                        )}
                        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
                        <View style={styles.actions}>
                            <Button title={t('common.cancel')} variant="outlined" onPress={onClose} style={styles.btn} />
                            <Button
                                title={t('engines.quote.save')}
                                onPress={save}
                                disabled={!online || busy || loading || !farmId}
                                loading={busy}
                                style={styles.btn}
                            />
                        </View>
                    </Card>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing[5] },
    sheet: { padding: theme.spacing[4], gap: theme.spacing[3] },
    title: { ...theme.typeScale.h3, color: c.textPrimary },
    sub: { ...theme.typeScale.bodyMedium, color: c.textSecondary },
    warn: { ...theme.typeScale.bodyMedium, color: c.warningText },
    row: { flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[2] },
    cell: { flex: 1 },
    head: { ...theme.typeScale.labelMedium, color: c.textSecondary },
    input: {
        minHeight: 44, borderWidth: 1, borderColor: c.borderDefault, borderRadius: theme.radius.sm,
        paddingHorizontal: theme.spacing[2], color: c.textPrimary,
    },
    addRow: { paddingVertical: theme.spacing[2], marginBottom: theme.spacing[2] },
    link: { ...theme.typeScale.labelLarge, color: c.primary },
    error: { ...theme.typeScale.bodyMedium, color: c.dangerText },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], justifyContent: 'flex-end' },
    btn: { flexGrow: 1, flexBasis: 120, paddingHorizontal: theme.spacing[4] },
});
