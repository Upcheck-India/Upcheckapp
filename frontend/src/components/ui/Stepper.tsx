import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface StepperProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

/**
 * Count input with large minus/plus controls — the farmer-friendly way to enter
 * whole counts (dead shrimp, sample size, trays) without a keyboard. Per
 * UPCHECK_DESIGN_SYSTEM.md: 48dp targets, icon + value, theme tokens, a11y labels.
 */
export const Stepper: React.FC<StepperProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    unit,
}) => {
    const clamp = (n: number) => Math.min(max, Math.max(min, Number(n.toFixed(4))));
    const atMin = value <= min;
    const atMax = value >= max;

    return (
        <View style={styles.field}>
            <Text style={styles.label} numberOfLines={2}>
                {label}{unit ? ` (${unit})` : ''}
            </Text>
            <View style={styles.row}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${label}`}
                    disabled={atMin}
                    onPress={() => onChange(clamp(value - step))}
                    style={[styles.btn, atMin && styles.btnDisabled]}
                >
                    <MaterialCommunityIcons
                        name="minus"
                        size={24}
                        color={atMin ? theme.roles.light.textTertiary : theme.roles.light.primary}
                    />
                </TouchableOpacity>

                <Text style={styles.value} accessibilityLabel={`${label} ${value}`}>{value}</Text>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${label}`}
                    disabled={atMax}
                    onPress={() => onChange(clamp(value + step))}
                    style={[styles.btn, atMax && styles.btnDisabled]}
                >
                    <MaterialCommunityIcons
                        name="plus"
                        size={24}
                        color={atMax ? theme.roles.light.textTertiary : theme.roles.light.primary}
                    />
                </TouchableOpacity>
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
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    btn: {
        width: 48,
        height: 48,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.roles.light.borderDefault,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.roles.light.surface,
    },
    btnDisabled: { opacity: 0.5 },
    value: {
        ...theme.typeScale.numericMedium,
        color: theme.roles.light.textPrimary,
        minWidth: 64,
        textAlign: 'center',
    },
});

export default Stepper;
