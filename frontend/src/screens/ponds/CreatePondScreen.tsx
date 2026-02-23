import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, typography, spacing, radius } from '../../theme';
import { pondsApi } from '../../api/ponds';

export const CreatePondScreen = ({ route, navigation }: any) => {
    const { farmId } = route.params;
    const [name, setName] = useState('');
    const [type, setType] = useState('Grow-out');
    const [shape, setShape] = useState<'rectangular' | 'circular'>('rectangular');
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [diameter, setDiameter] = useState('');
    const [depth, setDepth] = useState('');

    const [computedArea, setComputedArea] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string }>({});

    useEffect(() => {
        let area = 0;
        if (shape === 'rectangular') {
            const l = parseFloat(length) || 0;
            const w = parseFloat(width) || 0;
            area = l * w;
        } else {
            const d = parseFloat(diameter) || 0;
            const r = d / 2;
            area = Math.PI * r * r;
        }
        setComputedArea(area);
    }, [shape, length, width, diameter]);

    const handleSave = async () => {
        if (!name.trim()) {
            setErrors({ name: 'Pond name is required' });
            return;
        }
        setErrors({});
        setIsLoading(true);

        try {
            await pondsApi.create({
                farmId,
                name: name.trim(),
                type: type.trim() || 'Grow-out',
                shape,
                length: shape === 'rectangular' && length ? parseFloat(length) : undefined,
                width: shape === 'rectangular' && width ? parseFloat(width) : undefined,
                diameter: shape === 'circular' && diameter ? parseFloat(diameter) : undefined,
                depth: depth ? parseFloat(depth) : undefined,
                status: 'idle', // initial status
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create pond');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.formContainer}>
                <Input
                    label="Pond Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Pond A1"
                    error={errors.name}
                    required
                />

                <Input
                    label="Pond Type"
                    value={type}
                    onChangeText={setType}
                    placeholder="e.g. Grow-out, Nursery"
                />

                <Text style={styles.label}>Pond Shape</Text>
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, shape === 'rectangular' && styles.toggleActive]}
                        onPress={() => setShape('rectangular')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="rectangle-outline"
                            size={24}
                            color={shape === 'rectangular' ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[styles.toggleText, shape === 'rectangular' && styles.toggleTextActive]}>Rectangular</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, shape === 'circular' && styles.toggleActive]}
                        onPress={() => setShape('circular')}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="circle-outline"
                            size={24}
                            color={shape === 'circular' ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[styles.toggleText, shape === 'circular' && styles.toggleTextActive]}>Circular</Text>
                    </TouchableOpacity>
                </View>

                {shape === 'rectangular' ? (
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input label="Length (mm)" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                        <View style={styles.halfCol}>
                            <Input label="Width (mm)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" placeholder="0.0" />
                        </View>
                    </View>
                ) : (
                    <Input label="Diameter (mm)" value={diameter} onChangeText={setDiameter} keyboardType="decimal-pad" placeholder="0.0" />
                )}

                <Input label="Depth (mm)" value={depth} onChangeText={setDepth} keyboardType="decimal-pad" placeholder="0.0" />

                <Card style={styles.previewCard} variant="flat">
                    <Text style={styles.previewLabel}>Computed Area</Text>
                    <Text style={styles.previewValue}>{computedArea > 0 ? computedArea.toFixed(2) : '0.00'} mm²</Text>
                </Card>

                <Button
                    title="Save Pond"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    formContainer: {
        paddingTop: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfCol: {
        flex: 1,
    },
    label: {
        ...typography.labelMedium,
        color: Colors.textPrimary,
        marginBottom: spacing.xs,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: radius.md,
    },
    toggleActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight + '10',
    },
    toggleText: {
        ...typography.labelMedium,
        color: Colors.textSecondary,
    },
    toggleTextActive: {
        color: Colors.primary,
    },
    previewCard: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    previewLabel: {
        ...typography.bodyMedium,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    previewValue: {
        ...typography.h2,
        color: Colors.primary,
    },
    saveBtn: {
        marginTop: spacing.md,
    },
});
