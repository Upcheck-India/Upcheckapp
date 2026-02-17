import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker'; // Install if missing
import { ExpensesService } from '../../../services/expensesService';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ExpenseCategory } from '../../../types/database';

const ExpenseEntryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { cropId, pondId, pondName, cycleName } = route.params;

    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FEED);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async () => {
        if (!amount || !date) {
            Alert.alert('Validation Error', 'Amount and Date are required');
            return;
        }

        setSubmitting(true);
        try {
            await ExpensesService.create({
                pondId,
                cropId, // Can be null if general pond expense, but usually linked to cycle
                date,
                category,
                amount: parseFloat(amount),
                description,
            });
            Alert.alert('Success', 'Expense recorded successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save expense record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="Record Expense" subtitle={`${pondName} - ${cycleName || 'General'}`} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Date */}
                    {/* Ideally use a DatePicker, keeping simple for now */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                        mode="outlined"
                        value={date}
                        onChangeText={setDate}
                        placeholder="2024-01-01"
                        style={styles.input}
                    />

                    {/* Category */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Category</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={category}
                            onValueChange={(itemValue) => setCategory(itemValue as ExpenseCategory)}
                        >
                            {Object.values(ExpenseCategory).map((cat) => (
                                <Picker.Item key={cat} label={cat} value={cat} />
                            ))}
                        </Picker>
                    </View>

                    {/* Amount */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Amount (Rp)</Text>
                    <TextInput
                        mode="outlined"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        left={<TextInput.Affix text="Rp " />}
                        style={styles.input}
                    />

                    {/* Description */}
                    <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
                    <TextInput
                        mode="outlined"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Optional details..."
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
                        style={styles.submitButton}
                        buttonColor={Colors.error} // Red for expenses
                    >
                        Save Expense
                    </Button>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Layout.padding },
    sectionTitle: { marginTop: 16, marginBottom: 8, fontWeight: '600', color: Colors.text },
    input: { marginBottom: 8, backgroundColor: Colors.surface },
    pickerContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#79747E', // Standard outline color
        marginBottom: 8,
    },
    submitButton: { marginTop: 24, paddingVertical: 6 },
});

export default ExpenseEntryScreen;
