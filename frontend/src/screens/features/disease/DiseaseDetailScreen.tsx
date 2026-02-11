import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Chip, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

const DiseaseDetailScreen = ({ route }: any) => {
    const { disease } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>{disease.name}</Text>
                {disease.scientificName && (
                    <Text variant="titleMedium" style={styles.subtitle}>{disease.scientificName}</Text>
                )}

                <Card style={styles.card}>
                    <Card.Title title="Symptoms" />
                    <Card.Content>
                        {disease.symptoms?.map((symptom: string, index: number) => (
                            <List.Item
                                key={index}
                                title={symptom}
                                left={props => <List.Icon {...props} icon="alert-circle-outline" />}
                            />
                        ))}
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Title title="Treatment Recommendations" />
                    <Card.Content>
                        {disease.treatmentRecommendations?.map((item: string, index: number) => (
                            <List.Item
                                key={index}
                                title={item}
                                left={props => <List.Icon {...props} icon="medical-bag" />}
                            />
                        ))}
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Title title="Prevention Measures" />
                    <Card.Content>
                        {disease.preventionMeasures?.map((item: string, index: number) => (
                            <List.Item
                                key={index}
                                title={item}
                                left={props => <List.Icon {...props} icon="shield-check" />}
                            />
                        ))}
                    </Card.Content>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Layout.padding },
    title: { textAlign: 'center', marginBottom: 4, color: Colors.primaryDark, fontWeight: 'bold' },
    subtitle: { textAlign: 'center', marginBottom: 20, fontStyle: 'italic', color: Colors.textSecondary },
    card: { marginBottom: 16, backgroundColor: Colors.surface },
});

export default DiseaseDetailScreen;
