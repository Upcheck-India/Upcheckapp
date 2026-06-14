import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad';
}

/** Compact labeled numeric input used across the decision-engine screens. */
export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChangeText,
  unit,
  placeholder,
  keyboardType = 'decimal-pad',
}) => (
  <View style={styles.field}>
    <Text style={styles.label} numberOfLines={2}>{label}</Text>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.roles.light.textTertiary}
      />
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 130 },
  label: {
    ...theme.typeScale.labelSmall,
    color: theme.roles.light.textSecondary,
    marginBottom: theme.spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.roles.light.borderDefault,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.roles.light.surface,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing[2.5],
    ...theme.typeScale.bodyMedium,
    color: theme.roles.light.textPrimary,
  },
  unit: { ...theme.typeScale.labelSmall, color: theme.roles.light.textTertiary, flexShrink: 0, marginLeft: theme.spacing[1] },
});

export default NumberField;
