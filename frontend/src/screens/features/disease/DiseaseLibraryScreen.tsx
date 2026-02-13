import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Card, Text, Searchbar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { DiseaseService } from '../../../services/diseaseService';
import { EmptyState } from '../../../components/EmptyState';

const DiseaseLibraryScreen = ({ navigation }: any) => {
    const [diseases, setDiseases] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredDiseases, setFilteredDiseases] = useState<any[]>([]);

    useEffect(() => {
        loadDiseases();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            setFilteredDiseases(
                diseases.filter(d =>
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.scientificName?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredDiseases(diseases);
        }
    }, [searchQuery, diseases]);

    const loadDiseases = async () => {
        try {
            const data = await DiseaseService.getDiseaseLibrary();
            setDiseases(data);
            setFilteredDiseases(data);
        } catch (error) {
            console.error(error);
        }
    };

    const getSeverityColor = (level: string) => {
        if (level === 'high') return Colors.error;
        if (level === 'medium') return Colors.warning;
        return Colors.success;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>Disease Library</Text>
                <Searchbar
                    placeholder="Search diseases..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {filteredDiseases.length === 0 && (
                    <EmptyState
                        icon="magnify"
                        title="No diseases found"
                        subtitle={searchQuery ? `No results for "${searchQuery}".` : 'Disease library is empty.'}
                    />
                )}
                {filteredDiseases.map((disease) => (
                    <Card
                        key={disease.id}
                        style={styles.card}
                        onPress={() => navigation.navigate('DiseaseDetail', { disease })}
                    >
                        <Card.Title
                            title={disease.name}
                            subtitle={disease.scientificName}
                            left={(props) => (
                                <Avatar.Icon
                                    {...props}
                                    icon="virus-outline"
                                    style={{ backgroundColor: getSeverityColor(disease.severityLevel) + '20' }}
                                    color={getSeverityColor(disease.severityLevel)}
                                />
                            )}
                            right={() => (
                                <Chip
                                    style={{ backgroundColor: getSeverityColor(disease.severityLevel), marginRight: Layout.spacing.lg }}
                                    textStyle={{ color: Colors.textLight, fontSize: 11, fontWeight: '600' }}
                                >
                                    {disease.severityLevel?.toUpperCase()}
                                </Chip>
                            )}
                        />
                        <Card.Content>
                            <Text numberOfLines={2} variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                                {disease.symptoms?.join(', ')}
                            </Text>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: Layout.padding, paddingBottom: 0 },
    content: { padding: Layout.padding },
    title: { textAlign: 'center', marginBottom: Layout.spacing.lg, color: Colors.primaryDark, fontWeight: 'bold' },
    searchBar: { marginBottom: Layout.spacing.sm, backgroundColor: Colors.surfaceVariant, elevation: 0, borderRadius: Layout.radius.md },
    card: { marginBottom: Layout.spacing.md, backgroundColor: Colors.cardBackground, borderRadius: Layout.radius.lg },
});

export default DiseaseLibraryScreen;
