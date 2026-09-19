import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { formatDate } from '../../utils/formatDate';
import { listSources } from '../../features/bannedSubstances';
import { useBannedSubstancesStore } from '../../features/bannedSubstancesStore';

/** "19 Sep 2026" for a 'YYYY-MM-DD' list date (noon avoids a timezone day shift). */
export const formatListDate = (isoDate: string): string =>
    formatDate(`${isoDate}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' });

/** "List of 19 Sep 2026" — shown on every banned-substance warning (spec D1). */
export const useBannedListLabel = (): string => {
    const { t } = useTranslation();
    const version = useBannedSubstancesStore((s) => s.version);
    return t('logs.banned_listOf', { date: formatListDate(version) });
};

/** The sources + reviewed-date sheet (spec D1 "Copy"). */
export const BannedSourcesSheet = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const substances = useBannedSubstancesStore((s) => s.substances);
    const reviewedOn = useBannedSubstancesStore((s) => s.reviewedOn);
    const reviewedBy = useBannedSubstancesStore((s) => s.reviewedBy);
    const listLabel = useBannedListLabel();
    const sources = listSources(substances);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                <Pressable style={styles.sheet} onPress={() => undefined}>
                    <Text style={styles.title}>{t('logs.banned_sourcesTitle')}</Text>
                    <Text style={styles.meta}>{listLabel}</Text>
                    <Text style={styles.meta}>
                        {reviewedOn && reviewedBy
                            ? t('logs.banned_reviewed', { date: formatListDate(reviewedOn), name: reviewedBy })
                            : t('logs.banned_notReviewed')}
                    </Text>
                    <ScrollView style={styles.list}>
                        {sources.map((src) => (
                            <TouchableOpacity
                                key={`${src.instrument}|${src.url}`}
                                onPress={() => void Linking.openURL(src.url)}
                                accessibilityRole="link"
                                style={styles.source}
                            >
                                <Text style={styles.authority}>{src.authority}</Text>
                                <Text style={styles.instrument}>{src.instrument}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text style={styles.disclaimer}>{t('logs.banned_disclaimer')}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                        <Text style={styles.closeLabel}>{t('common.close')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

/**
 * The fixed line under every banned-substance banner: "may be incomplete" plus
 * the list date, linking to the sources sheet.
 */
export const BannedListNotice = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const listLabel = useBannedListLabel();
    return (
        <View style={styles.notice}>
            <Text style={styles.noticeText}>{t('logs.banned_disclaimer')}</Text>
            <TouchableOpacity onPress={() => setOpen(true)} accessibilityRole="button">
                <Text style={styles.link}>
                    {listLabel} · {t('logs.banned_sourcesLink')}
                </Text>
            </TouchableOpacity>
            <BannedSourcesSheet visible={open} onClose={() => setOpen(false)} />
        </View>
    );
};

const c = theme.roles.light;
const styles = StyleSheet.create({
    notice: { marginTop: -theme.spacing[2], marginBottom: theme.spacing[4], paddingHorizontal: theme.spacing[1] },
    noticeText: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    link: { ...theme.typeScale.bodySmall, color: c.primary, marginTop: theme.spacing[1], textDecorationLine: 'underline' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing[4] },
    sheet: { backgroundColor: c.surface, borderRadius: 12, padding: theme.spacing[4], maxHeight: '85%' },
    title: { ...theme.typeScale.h4, color: c.textPrimary, marginBottom: theme.spacing[2] },
    meta: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    list: { marginVertical: theme.spacing[3] },
    source: { paddingVertical: theme.spacing[2], borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    authority: { ...theme.typeScale.bodySmall, color: c.textPrimary, fontWeight: '600' },
    instrument: { ...theme.typeScale.bodySmall, color: c.primary },
    disclaimer: { ...theme.typeScale.bodySmall, color: c.textSecondary },
    closeBtn: { alignSelf: 'flex-end', marginTop: theme.spacing[3], padding: theme.spacing[2] },
    closeLabel: { ...theme.typeScale.bodyMedium, color: c.primary },
});
