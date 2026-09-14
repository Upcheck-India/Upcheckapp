/**
 * The Daily Brief's quiet vocabulary: a titled section separated by a hairline,
 * and a one-line item with an optional status dot. No cards — hierarchy comes
 * from size, weight and space, so the ribbon and the score stay the only loud
 * things on the page.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import type { Band, Severity } from '../../api/dailyBrief';

export const c = theme.roles.light;

export const BAND_TONE: Record<Band | 'none' | 'incomplete', { text: string; bg: string; mark: string }> = {
    good: { text: c.successText, bg: c.successBg, mark: c.successBorder },
    watch: { text: c.warningText, bg: c.warningBg, mark: c.warningBorder },
    attention: { text: c.dangerText, bg: c.dangerBg, mark: c.dangerBorder },
    none: { text: c.staleText, bg: c.staleBg, mark: c.staleBorder },
    // Too few stocked ponds scored: grey, never a band colour.
    incomplete: { text: c.textTertiary, bg: c.surfaceVariant, mark: c.borderStrong },
};

export const SEVERITY_MARK: Record<Severity, string> = {
    watch: c.warningBorder,
    critical: c.dangerBorder,
};

export const Section: React.FC<{
    title: string;
    trailing?: string | null;
    first?: boolean;
    children: React.ReactNode;
    testID?: string;
}> = ({ title, trailing, first, children, testID }) => (
    <View style={[styles.section, first && styles.first]} testID={testID}>
        <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">
                {title}
            </Text>
            {!!trailing && <Text style={styles.trailing}>{trailing}</Text>}
        </View>
        {children}
    </View>
);

export const Line: React.FC<{
    text: string;
    meta?: string | null;
    mark?: string | null;
    /** Muted text — a quiet, reassuring or finished line. */
    muted?: boolean;
    struck?: boolean;
    /** Status-coloured text for a line that must not read as routine. */
    tone?: 'danger' | 'warning';
    actionLabel?: string;
    onAction?: () => void;
}> = ({ text, meta, mark, muted, struck, tone, actionLabel, onAction }) => (
    <View style={styles.line}>
        <View style={[styles.dot, { backgroundColor: mark ?? 'transparent' }]} />
        <View style={styles.lineText}>
            <Text style={[styles.lineMain, muted && styles.muted, struck && styles.struck, tone && styles[tone]]}>{text}</Text>
            {!!meta && <Text style={styles.meta}>{meta}</Text>}
        </View>
        {!!actionLabel && (
            <TouchableOpacity onPress={onAction} hitSlop={HIT} accessibilityRole="button" style={styles.action}>
                <Text style={styles.actionText}>{actionLabel}</Text>
            </TouchableOpacity>
        )}
    </View>
);

export const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: theme.spacing[5],
        paddingTop: theme.spacing[6],
        paddingBottom: theme.spacing[2],
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.borderStrong,
    },
    first: { borderTopWidth: 0 },
    head: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[3],
    },
    title: { ...theme.typeScale.h2, color: c.textPrimary, flexShrink: 1 },
    trailing: { ...theme.typeScale.numericSmall, color: c.textTertiary },
    line: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[2],
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
    lineText: { flex: 1, minWidth: 0 },
    lineMain: { ...theme.typeScale.bodyMedium, color: c.textPrimary },
    muted: { color: c.textSecondary },
    struck: { color: c.textTertiary, textDecorationLine: 'line-through' },
    danger: { color: c.dangerText, fontFamily: 'DMSans-SemiBold' },
    warning: { color: c.warningText },
    meta: { ...theme.typeScale.bodySmall, color: c.textTertiary, marginTop: 1 },
    action: { minHeight: 32, justifyContent: 'center' },
    actionText: { ...theme.typeScale.labelLarge, color: c.textLink },
});
