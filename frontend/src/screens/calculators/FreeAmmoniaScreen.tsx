import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../theme';
import { calculatorsApi, FreeAmmoniaResponse } from '../../api/calculators';

type ToxicityLevel = 'safe' | 'warning' | 'critical';

const getToxicityLevel = (nh3: number): ToxicityLevel => {
    if (nh3 > 0.5) return 'critical';
    if (nh3 >= 0.1) return 'warning';
    return 'safe';
};

const TOXICITY_CONFIG: Record<ToxicityLevel, {
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    bgColor: string;
    borderColor: string;
    textColor: string;
    message: string;
}> = {
    safe: {
        label: 'SAFE',
        icon: 'check-circle',
        bgColor: theme.roles.light.successBg,
        borderColor: theme.roles.light.successBorder,
        textColor: theme.roles.light.successText,
        message: 'NH₃ levels are within safe limits (< 0.1 ppm). No action required.',
    },
    warning: {
        label: 'WARNING',
        icon: 'alert-circle',
        bgColor: theme.roles.light.warningBg,
        borderColor: theme.roles.light.warningBorder,
        textColor: theme.roles.light.warningText,
        message: 'NH₃ levels are elevated (0.1–0.5 ppm). Consider reducing feed or partial water exchange.',
    },
    critical: {
        label: 'CRITICAL',
        icon: 'alert-decagram',
        bgColor: theme.roles.light.dangerBg,
        borderColor: theme.roles.light.dangerBorder,
        textColor: theme.roles.light.dangerText,
        message: 'DANGER: Toxic NH₃ levels (> 0.5 ppm)! Reduce feeding immediately and perform water exchange.',
    },
};

export const FreeAmmoniaScreen = ({ navigation }: any) => {
    const [tan, setTan] = useState('');
    const [ph, setPh] = useState('');
    const [temperature, setTemperature] = useState('');
    const [salinity, setSalinity] = useState('15');

    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<FreeAmmoniaResponse | null>(null);

    const handleCalculate = async () => {
        const tanVal = parseFloat(tan);
        const phVal = parseFloat(ph);
        const tempVal = parseFloat(temperature);

        if (!tanVal || tanVal <= 0) {
            Alert.alert('Validation Error', 'TAN must be a positive number');
            return;
        }
        if (!phVal || phVal <= 0 || phVal > 14) {
            Alert.alert('Validation Error', 'pH must be between 0 and 14');
            return;
        }
        if (!tempVal || tempVal <= 0) {
            Alert.alert('Validation Error', 'Temperature must be a positive number');
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await calculatorsApi.calculateFreeAmmonia({
                tan: tanVal,
                ph: phVal,
                temperature: tempVal,
            });
            setResult(data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to calculate free ammonia');
        } finally {
            setIsLoading(false);
        }
    };

    const level = result ? getToxicityLevel(result.unionizedAmmonia) : null;
    const config = level ? TOXICITY_CONFIG[level] : null;

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Free Ammonia (NH₃)</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Water Parameters</Text>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="TAN (ppm)"
                                value={tan}
                                onChangeText={setTan}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 1.5"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="pH"
                                value={ph}
                                onChangeText={setPh}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 8.2"
                                required
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfCol}>
                            <Input
                                label="Temperature (°C)"
                                value={temperature}
                                onChangeText={setTemperature}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 29"
                                required
                            />
                        </View>
                        <View style={styles.halfCol}>
                            <Input
                                label="Salinity (ppt)"
                                value={salinity}
                                onChangeText={setSalinity}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 15"
                                hint="For reference only"
                            />
                        </View>
                    </View>

                    <Button title="Calculate NH₃" onPress={handleCalculate} loading={isLoading} style={styles.calcBtn} />
                </Card>

                {result && config && (
                    <View style={[styles.resultBox, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
                        <MaterialCommunityIcons
                            name={config.icon}
                            size={48}
                            color={config.textColor}
                            style={styles.resultIcon}
                        />
                        <View style={[styles.levelBadge, { backgroundColor: config.borderColor }]}>
                            <Text style={styles.levelBadgeText}>{config.label}</Text>
                        </View>
                        <Text style={[styles.resultLabel, { color: config.textColor }]}>
                            Free Ammonia (NH₃)
                        </Text>
                        <Text style={styles.resultValue}>{result.unionizedAmmonia.toFixed(4)}</Text>
                        <Text style={styles.resultUnit}>ppm / mg/L</Text>

                        <Text style={[styles.messageText, { color: config.textColor }]}>
                            {config.message}
                        </Text>
                    </View>
                )}

                <Card style={styles.scaleCard}>
                    <Text style={styles.scaleTitle}>Toxicity Scale</Text>
                    <View style={styles.scaleRow}>
                        <View style={[styles.scaleBlock, { backgroundColor: theme.roles.light.successBg, borderColor: theme.roles.light.successBorder }]}>
                            <Text style={[styles.scaleLabel, { color: theme.roles.light.successText }]}>Safe</Text>
                            <Text style={styles.scaleRange}>{'< 0.1 ppm'}</Text>
                        </View>
                        <View style={[styles.scaleBlock, { backgroundColor: theme.roles.light.warningBg, borderColor: theme.roles.light.warningBorder }]}>
                            <Text style={[styles.scaleLabel, { color: theme.roles.light.warningText }]}>Warning</Text>
                            <Text style={styles.scaleRange}>0.1 – 0.5 ppm</Text>
                        </View>
                        <View style={[styles.scaleBlock, { backgroundColor: theme.roles.light.dangerBg, borderColor: theme.roles.light.dangerBorder }]}>
                            <Text style={[styles.scaleLabel, { color: theme.roles.light.dangerText }]}>Critical</Text>
                            <Text style={styles.scaleRange}>{'> 0.5 ppm'}</Text>
                        </View>
                    </View>
                </Card>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.roles.light.borderDefault,
        backgroundColor: theme.roles.light.surface,
        paddingHorizontal: theme.spacing[4],
    },
    backBtn: {
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h3,
        color: theme.roles.light.textPrimary,
    },
    content: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[12],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    halfCol: {
        flex: 1,
    },
    calcBtn: {
        marginTop: theme.spacing[4],
    },
    resultBox: {
        padding: theme.spacing[8],
        borderRadius: theme.radius.md,
        alignItems: 'center',
        borderWidth: 2,
        marginTop: theme.spacing[2],
        marginBottom: theme.spacing[6],
    },
    resultIcon: {
        marginBottom: theme.spacing[3],
    },
    levelBadge: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.full,
        marginBottom: theme.spacing[3],
    },
    levelBadgeText: {
        ...theme.typeScale.labelLarge,
        color: theme.roles.light.textInverse,
        fontWeight: '700',
    },
    resultLabel: {
        ...theme.typeScale.h4,
        marginBottom: theme.spacing[2],
    },
    resultValue: {
        fontSize: 40,
        fontWeight: '700',
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[1],
    },
    resultUnit: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
    },
    messageText: {
        ...theme.typeScale.bodyMedium,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 20,
    },
    scaleCard: {
        marginBottom: theme.spacing[6],
    },
    scaleTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
    },
    scaleRow: {
        flexDirection: 'row',
        gap: theme.spacing[3],
    },
    scaleBlock: {
        flex: 1,
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[2],
        borderRadius: theme.radius.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    scaleLabel: {
        ...theme.typeScale.labelMedium,
        fontWeight: '700',
        marginBottom: theme.spacing[1],
    },
    scaleRange: {
        ...theme.typeScale.caption,
        color: theme.roles.light.textSecondary,
    },
});
