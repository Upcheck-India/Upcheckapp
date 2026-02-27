import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { theme } from '../../theme';
import { feedApi } from '../../api/feedRecords';

export const FeedLogScreen = ({ route, navigation }: any) => {
    const { pondId, pondName } = route.params;

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fasting, setFasting] = useState(false);

    // Tray percentages (for tracking leftovers)
    const [tray1, setTray1] = useState('');
    const [tray2, setTray2] = useState('');
    const [tray3, setTray3] = useState('');
    const [tray4, setTray4] = useState('');

    const [totalFeed, setTotalFeed] = useState('');
    const [feedType, setFeedType] = useState('Pellet Starter');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!fasting) {
            if (!totalFeed || isNaN(parseFloat(totalFeed))) {
                Alert.alert('Validation', 'Please enter a valid total feed amount');
                return;
            }
        }

        setIsLoading(true);

        // Convert tray states to a note string
        let combinedNotes = notes;
        if (tray1 || tray2 || tray3 || tray4) {
            combinedNotes = `Trays leftovers: [1: ${tray1 || 0}%, 2: ${tray2 || 0}%, 3: ${tray3 || 0}%, 4: ${tray4 || 0}%]. ${notes}`.trim();
        }

        try {
            await feedApi.create({
                pondId,
                feedType: feedType.trim() || 'Pellet',
                quantityKg: fasting ? 0 : parseFloat(totalFeed),
                feedingTime: date,
                notes: combinedNotes || undefined,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to save feed record');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper scroll={false} padded={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.roles.light.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Feed Entry</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Logging for {pondName}</Text>

                <Card style={styles.card}>
                    <View style={styles.fastingRow}>
                        <View>
                            <Text style={styles.sectionTitle}>Fasting Day</Text>
                            <Text style={styles.labelDesc}>Check if no feed was given today</Text>
                        </View>
                        <Switch
                            value={fasting}
                            onValueChange={setFasting}
                            trackColor={{ false: theme.roles.light.borderDefault, true: theme.roles.light.infoBg }}
                            thumbColor={fasting ? theme.roles.light.primary : '#f4f3f4'}
                        />
                    </View>

                    <View style={[styles.dateInput, { marginTop: theme.spacing[4] }]}>
                        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" required />
                    </View>
                </Card>

                {!fasting && (
                    <>
                        <Card style={styles.card}>
                            <Text style={styles.sectionTitle}>Feeding Amount</Text>
                            <Input
                                label="Total Feed Given (kg)"
                                value={totalFeed}
                                onChangeText={setTotalFeed}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                required
                            />
                            <Input
                                label="Feed Type/Brand"
                                value={feedType}
                                onChangeText={setFeedType}
                                placeholder="e.g. Grower 2mm"
                            />
                        </Card>

                        <Card style={styles.card}>
                            <Text style={styles.sectionTitle}>Feeding Trays (Leftover %)</Text>
                            <Text style={styles.labelDesc}>Estimate remaining feed after 2 hours</Text>

                            <View style={styles.trayGrid}>
                                <View style={styles.trayItem}>
                                    <Input label="Tray 1" value={tray1} onChangeText={setTray1} keyboardType="number-pad" placeholder="0%" />
                                </View>
                                <View style={styles.trayItem}>
                                    <Input label="Tray 2" value={tray2} onChangeText={setTray2} keyboardType="number-pad" placeholder="0%" />
                                </View>
                            </View>
                            <View style={styles.trayGrid}>
                                <View style={styles.trayItem}>
                                    <Input label="Tray 3" value={tray3} onChangeText={setTray3} keyboardType="number-pad" placeholder="0%" />
                                </View>
                                <View style={styles.trayItem}>
                                    <Input label="Tray 4" value={tray4} onChangeText={setTray4} keyboardType="number-pad" placeholder="0%" />
                                </View>
                            </View>
                        </Card>
                    </>
                )}

                <Card style={styles.card}>
                    <Input
                        label="Notes / Behavior"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Appetite, weather during feeding..."
                        multiline
                        numberOfLines={3}
                        style={styles.textArea}
                    />
                </Card>

                <Button
                    title="Save Record"
                    onPress={handleSave}
                    loading={isLoading}
                    style={styles.saveBtn}
                />
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
    subtitle: {
        ...theme.typeScale.bodyMedium,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[4],
    },
    card: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        ...theme.typeScale.h4,
        color: theme.roles.light.textPrimary,
        marginBottom: 4,
    },
    labelDesc: {
        ...theme.typeScale.bodySmall,
        color: theme.roles.light.textSecondary,
        marginBottom: theme.spacing[3],
    },
    fastingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateInput: {
        paddingTop: theme.spacing[4],
        borderTopWidth: 1,
        borderTopColor: theme.roles.light.borderDefault,
    },
    trayGrid: {
        flexDirection: 'row',
        gap: theme.spacing[4],
    },
    trayItem: {
        flex: 1,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[8],
    },
});
