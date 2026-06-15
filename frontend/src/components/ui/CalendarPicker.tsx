import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface CalendarPickerProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
    required?: boolean;
    helperText?: string;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

/**
 * Pure-JS month calendar in a modal. No native date-picker dependency (keeps the
 * bare-workflow build clean). Out-of-range days are disabled, not hidden.
 */
export const CalendarPicker: React.FC<CalendarPickerProps> = ({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    required = false,
    helperText,
}) => {
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

    const min = minDate ? startOfDay(minDate) : null;
    const max = maxDate ? startOfDay(maxDate) : null;

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const isDisabled = (d: Date) => (min && d < min) || (max && d > max);
    const canGoPrev = !min || new Date(year, month, 1) > min;
    const canGoNext = !max || new Date(year, month + 1, 1) <= max;

    return (
        <View style={styles.container}>
            <View style={styles.labelHeader}>
                <Text style={styles.label}>{label}</Text>
                {required && <Text style={styles.requiredAsterisk}>*</Text>}
            </View>

            <TouchableOpacity
                style={styles.field}
                onPress={() => {
                    setViewMonth(new Date(value.getFullYear(), value.getMonth(), 1));
                    setOpen(true);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={20}
                    color={theme.roles.light.primary}
                    style={{ marginRight: theme.spacing[2] }}
                />
                <Text style={styles.value}>{formatDate(value)}</Text>
                <MaterialCommunityIcons name="chevron-down" size={22} color={theme.roles.light.textSecondary} />
            </TouchableOpacity>

            {helperText && <Text style={styles.helper}>{helperText}</Text>}

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.monthHeader}>
                            <TouchableOpacity
                                disabled={!canGoPrev}
                                onPress={() => setViewMonth(new Date(year, month - 1, 1))}
                                hitSlop={8}
                            >
                                <MaterialCommunityIcons
                                    name="chevron-left"
                                    size={26}
                                    color={canGoPrev ? theme.roles.light.textPrimary : theme.roles.light.textTertiary}
                                />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
                            <TouchableOpacity
                                disabled={!canGoNext}
                                onPress={() => setViewMonth(new Date(year, month + 1, 1))}
                                hitSlop={8}
                            >
                                <MaterialCommunityIcons
                                    name="chevron-right"
                                    size={26}
                                    color={canGoNext ? theme.roles.light.textPrimary : theme.roles.light.textTertiary}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekRow}>
                            {WEEKDAYS.map((w, i) => (
                                <Text key={i} style={styles.weekday}>{w}</Text>
                            ))}
                        </View>

                        <View style={styles.grid}>
                            {cells.map((d, i) => {
                                if (!d) return <View key={i} style={styles.cell} />;
                                const disabled = isDisabled(d);
                                const selected = sameDay(d, value);
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.cell}
                                        disabled={!!disabled}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            onChange(d);
                                            setOpen(false);
                                        }}
                                    >
                                        <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                                            <Text
                                                style={[
                                                    styles.dayText,
                                                    selected && styles.dayTextSelected,
                                                    disabled && styles.dayTextDisabled,
                                                ]}
                                            >
                                                {d.getDate()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: theme.spacing[4] },
    labelHeader: { flexDirection: 'row', marginBottom: theme.spacing[2] },
    label: { ...theme.typeScale.labelMedium, color: theme.roles.light.textSecondary },
    requiredAsterisk: { ...theme.typeScale.labelMedium, color: theme.roles.light.dangerText, marginLeft: 2 },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    value: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary, flex: 1 },
    helper: { ...theme.typeScale.caption, color: theme.roles.light.primary, marginTop: theme.spacing[1] },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing[5] },
    sheet: {
        backgroundColor: theme.roles.light.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing[4],
    },
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
    },
    monthTitle: { ...theme.typeScale.h3, color: theme.roles.light.textPrimary },
    weekRow: { flexDirection: 'row', marginBottom: theme.spacing[1] },
    weekday: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        width: `${100 / 7}%`,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircleSelected: { backgroundColor: theme.roles.light.primary },
    dayText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    dayTextSelected: { color: theme.roles.light.textInverse, fontWeight: '700' },
    dayTextDisabled: { color: theme.roles.light.textTertiary },
});
