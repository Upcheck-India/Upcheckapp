import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Searchbar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';
import { DiseaseService } from '../../../services/diseaseService';

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
                {filteredDiseases.map((disease) => (
                    <Card
                        key={disease.id}
                        style={styles.card}
                        onPress={() => navigation.navigate('DiseaseDetail', { disease })}
                    >
                        <Card.Title
                            title={disease.name}
                            subtitle={disease.scientificName}
                            right={(props) => (
                                <Chip
                                    style={{ backgroundColor: getSeverityColor(disease.severityLevel), marginRight: 16 }}
                                    textStyle={{ color: 'white' }}
                                >
                                    {disease.severityLevel?.toUpperCase()}
                                </Chip>
                            )}
                        />
                        <Card.Content>
                            <Text numberOfLines={2} variant="bodyMedium">
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
    title: { textAlign: 'center', marginBottom: 16, color: Colors.primaryDark, fontWeight: 'bold' },
    searchBar: { marginBottom: 8, backgroundColor: Colors.surface },
    card: { marginBottom: 12, backgroundColor: Colors.surface },
});

export default DiseaseLibraryScreen;
