import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardView } from './components/DashboardView';
import { CycleAnalysisView } from './components/CycleAnalysisView';
import { FinancialReportView } from './components/FinancialReportView';
import { ReportsService, DashboardSummary } from '../../../services/reportsService';
import { PondService } from '../../../services/pondService';
import { useAuthStore } from '../../../store/authStore';
import { Colors } from '../../../constants/Colors';
import { Layout } from '../../../constants/Layout';

export const ReportsScreen = ({ navigation }) => {
    const [tab, setTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

    // For now, hardcode farmId or fetch from user context if available. 
    // Assuming user has one farm for simplicity in this sprint.
    // Ideally, we fetch the user's farms and pick the first one.
    const [farmId, setFarmId] = useState<string>('');
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        if (user) {
            // Fetch farms or use a placeholder logic to get farmId
            // Since we don't have a farm selector in global state yet, we might need to fetch it.
            // For now, let's fetch the first pond and use its farmId or just pass nothing to dashboard 
            // and let backend handle it if it can derive from user.
            // But backend getDashboardSummary expects farmId.
            // Let's try to fetch ponds to get a farmId, or assume user has a farmId in their profile (not currently there).
            fetchInitialData();
        }
    }, [user]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Hack: Fetch ponds to get a farmId. 
            // Real app should have selectedFarm in store.
            const { ponds } = await PondService.fetchPonds('', { page: 1 });
            if (ponds.length > 0) {
                const fid = ponds[0].farmId;
                setFarmId(fid);

                // Also find an active cycle for analysis tab
                const activePond = ponds.find(p => p.activeCycleId);
                if (activePond) {
                    setSelectedCycleId(activePond.activeCycleId);
                }

                // Fetch dashboard data
                const summary = await ReportsService.getDashboardSummary(fid);
                setDashboardData(summary);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        switch (tab) {
            case 'dashboard':
                return <DashboardView data={dashboardData} loading={loading} />;
            case 'production':
                return <CycleAnalysisView cycleId={selectedCycleId} />;
            case 'financial':
                return <FinancialReportView farmId={farmId} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.title}>Reports</Text>
            </View>

            <View style={styles.tabContainer}>
                <SegmentedButtons
                    value={tab}
                    onValueChange={setTab}
                    buttons={[
                        { value: 'dashboard', label: 'Overview' },
                        { value: 'production', label: 'Production' },
                        { value: 'financial', label: 'Financials' },
                    ]}
                    style={styles.tabs}
                    theme={{ colors: { secondaryContainer: Colors.primaryLight } }}
                />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {renderContent()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: Layout.padding,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
    },
    title: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    tabContainer: {
        padding: Layout.padding,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    tabs: {

    },
    content: {
        paddingBottom: 24,
    }
});
