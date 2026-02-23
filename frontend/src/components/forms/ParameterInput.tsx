import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Colors, typography, spacing, radius } from '../../theme';
import { getParameterStatus, ParameterStatus } from '../../constants/ranges';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ParameterInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    parameterKey?: Parameters<typeof getParameterStatus>[0];
    placeholder?: string;
    unit?: string;
    required?: boolean;
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
    label,
    value,
    onChangeText,
    parameterKey,
    placeholder = '0.0',
    unit,
    required
}) => {
    const numValue = value ? parseFloat(value) : undefined;
    const status: ParameterStatus = parameterKey ? getParameterStatus(parameterKey, numValue) : 'none';

    const getStatusColor = () => {
        switch (status) {
            case 'safe': return Colors.success;
            case 'warning': return Colors.warning;
            case 'critical': return Colors.error;
            default: return Colors.border;
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'safe': return 'check-circle';
            case 'warning': return 'alert-circle';
            case 'critical': return 'alert-decagram';
            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label} {unit ? `(${unit})` : ''}
                {required && <Text style={styles.required}> *</Text>}
            </Text>

            <View style={[styles.inputContainer, status !== 'none' && { borderColor: getStatusColor() }]}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="decimal-pad"
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textDisabled}
                />
                {status !== 'none' && (
                    <View style={styles.iconWrapper}>
                        <MaterialCommunityIcons name={getStatusIcon() as any} size={20} color={getStatusColor()} />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        flex: 1,
    },
    label: {
        ...typography.labelMedium,
        color: Colors.textPrimary,
        marginBottom: spacing.xs,
    },
    required: {
        color: Colors.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: radius.md,
        backgroundColor: Colors.surface,
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md - 2,
        ...typography.bodyMedium,
        color: Colors.textPrimary,
    },
    iconWrapper: {
        paddingRight: spacing.md,
    },
});
