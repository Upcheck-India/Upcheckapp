import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

export interface ChipOption {
    value: string;
    label: string;
    /** Optional MaterialCommunityIcons glyph (no emojis — design system §4). */
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface ChipGroupProps {
    label?: string;
    options: ChipOption[];
    /** Selected value (single) or values (multiple). */
    value: string | string[] | null;
    onChange: (value: any) => void;
    multiple?: boolean;
}

/**
 * Selectable chips — the farmer-friendly alternative to dropdowns for enums
 * (feed type, mortality cause, severity). Tap to select; supports single or
 * multi-select. Selected = primary fill; unselected = outline. Per
 * UPCHECK_DESIGN_SYSTEM.md (icon + label, theme tokens, ≥44dp targets, a11y).
 */
export const ChipGroup: React.FC<ChipGroupProps> = ({
    label,
    options,
    value,
    onChange,
    multiple = false,
}) => {
    const selectedSet = new Set(
        Array.isArray(value) ? value : value != null ? [value] : [],
    );

    const toggle = (v: string) => {
        if (multiple) {
            const next = new Set(selectedSet);
            next.has(v) ? next.delete(v) : next.add(v);
            onChange([...next]);
        } else {
            onChange(selectedSet.has(v) ? null : v);
        }
    };

    return (
        <View style={styles.field}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <View style={styles.row}>
                {options.map((opt) => {
                    const selected = selectedSet.has(opt.value);
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            accessibilityRole={multiple ? 'checkbox' : 'radio'}
                            accessibilityState={{ selected, checked: selected }}
                            accessibilityLabel={opt.label}
                            onPress={() => toggle(opt.value)}
                            style={[styles.chip, selected && styles.chipSelected]}
                            activeOpacity={0.7}
                        >
                            {opt.icon ? (
                                <MaterialCommunityIcons
                                    name={opt.icon}
                                    size={16}
                                    color={selected ? theme.roles.light.textInverse : theme.roles.light.textSecondary}
                                    style={styles.chipIcon}
                                />
                            ) : null}
                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    field: { marginBottom: 12 },
    label: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
        marginBottom: 8,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
    },
    chipSelected: {
        backgroundColor: theme.roles.light.primary,
        borderColor: theme.roles.light.primary,
    },
    chipIcon: { marginRight: 6 },
    chipText: { ...theme.typeScale.bodyMedium, color: theme.roles.light.textPrimary },
    chipTextSelected: { color: theme.roles.light.textInverse },
});

export default ChipGroup;
