import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

const c = theme.roles.light;

/** A row of single-choice chips; tapping the selected one clears it. */
export function ChoiceChips<K extends string>({
    options,
    value,
    onChange,
    testIDPrefix,
}: {
    options: { key: K; label: string }[];
    value: K | null | undefined;
    onChange: (k: K | null) => void;
    testIDPrefix?: string;
}) {
    return (
        <View style={styles.row}>
            {options.map((o) => {
                const on = o.key === value;
                return (
                    <TouchableOpacity
                        key={o.key}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => onChange(on ? null : o.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        testID={testIDPrefix ? `${testIDPrefix}-${o.key}` : undefined}
                    >
                        <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    chip: {
        paddingVertical: theme.spacing[1.5],
        paddingHorizontal: theme.spacing[3],
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.borderDefault,
        backgroundColor: c.surface,
    },
    chipOn: { borderColor: c.primary, backgroundColor: c.primary + '18' },
    text: { ...theme.typeScale.bodySmall, color: c.textPrimary },
    textOn: { color: c.primary, fontWeight: '700' },
});
