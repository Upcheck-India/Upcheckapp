import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
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
                            color={shape === 'rectangular' ? theme.roles.light.primary : theme.roles.light.textSecondary}
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
                            color={shape === 'circular' ? theme.roles.light.primary : theme.roles.light.textSecondary}
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
        paddingTop: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    label: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[2],
    },
    toggleRow: {
        flexDirection: 'row',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[4],
        backgroundColor: theme.roles.light.surface,
        borderWidth: 1.5,
        borderColor: theme.roles.light.borderDefault,
        borderRadius: theme.radius.md,
    },
    toggleActive: {
        borderColor: theme.roles.light.primary,
        backgroundColor: theme.roles.light.infoBg,
    },
    toggleText: {
        ...theme.typeScale.labelMedium,
        color: theme.roles.light.textSecondary,
    },
    toggleTextActive: {
        color: theme.roles.light.primary,
    },
    previewCard: {
        alignItems: 'center',
        paddingVertical: theme.spacing[6],
        marginTop: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
    previewLabel: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: 4,
    },
    previewValue: {
        ...theme.typeScale.h2,
        color: theme.roles.light.primary,
    },
    saveBtn: {
        marginTop: theme.spacing[4],
    },
});
