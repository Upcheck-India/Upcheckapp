import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuthStore } from '../store/authStore';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { TruecallerLoginScreen } from '../screens/auth/TruecallerLoginScreen';

// Main Navigation
import { MainNavigator } from './MainNavigator';

// Phase 2 Screens
import { CreateFarmScreen } from '../screens/farms/CreateFarmScreen';
import { FarmDetailScreen } from '../screens/farms/FarmDetailScreen';
import { CreatePondScreen } from '../screens/ponds/CreatePondScreen';
import { PondDashboardScreen } from '../screens/ponds/PondDashboardScreen';
import { CreateCycleScreen } from '../screens/cycles/CreateCycleScreen';
import { CycleDetailScreen } from '../screens/cycles/CycleDetailScreen';

// Phase 3 Screens (Logs)
import { WaterQualityLogScreen } from '../screens/logs/WaterQualityLogScreen';
import { FeedLogScreen } from '../screens/logs/FeedLogScreen';
import { SamplingLogScreen } from '../screens/logs/SamplingLogScreen';
import { TreatmentLogScreen } from '../screens/logs/TreatmentLogScreen';
import { HarvestLogScreen } from '../screens/logs/HarvestLogScreen';
import { MortalityLogScreen } from '../screens/logs/MortalityLogScreen';
import { ChemicalLogScreen } from '../screens/logs/ChemicalLogScreen';
import { PlanktonLogScreen } from '../screens/logs/PlanktonLogScreen';
import { MicrobiologyLogScreen } from '../screens/logs/MicrobiologyLogScreen';
import { DiseaseLogScreen } from '../screens/logs/DiseaseLogScreen';

// Phase 4 Screens (Calculators & Simulations)
import { CalculatorHubScreen } from '../screens/calculators/CalculatorHubScreen';
import { CultivationPerformanceScreen } from '../screens/calculators/CultivationPerformanceScreen';
import { DailyFeedCalculatorScreen } from '../screens/calculators/DailyFeedCalculatorScreen';
import { ProductAmountScreen } from '../screens/calculators/ProductAmountScreen';
import { FreeAmmoniaScreen } from '../screens/calculators/FreeAmmoniaScreen';

import { SimulationListScreen } from '../screens/simulation/SimulationListScreen';
import { SimulationCreateScreen } from '../screens/simulation/SimulationCreateScreen';
import { SimulationResultsScreen } from '../screens/simulation/SimulationResultsScreen';

// Phase 5 Screens (History & Polish)
import { WaterQualityHistoryScreen } from '../screens/logs/History/WaterQualityHistoryScreen';
import { FeedHistoryScreen } from '../screens/logs/History/FeedHistoryScreen';
import { SamplingHistoryScreen } from '../screens/logs/History/SamplingHistoryScreen';
import { TreatmentHistoryScreen } from '../screens/logs/History/TreatmentHistoryScreen';
import { HarvestHistoryScreen } from '../screens/logs/History/HarvestHistoryScreen';
import { ChemicalHistoryScreen } from '../screens/logs/History/ChemicalHistoryScreen';
import { PlanktonHistoryScreen } from '../screens/logs/History/PlanktonHistoryScreen';
import { MicrobiologyHistoryScreen } from '../screens/logs/History/MicrobiologyHistoryScreen';
import { DiseaseHistoryScreen } from '../screens/logs/History/DiseaseHistoryScreen';
import { MortalityHistoryScreen } from '../screens/logs/History/MortalityHistoryScreen';

import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { HelpScreen } from '../screens/settings/HelpScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';
import { InventoryListScreen } from '../screens/inventory/InventoryListScreen';
import { InventoryDetailScreen } from '../screens/inventory/InventoryDetailScreen';

// Disease Encyclopedia
import { DiseaseListScreen } from '../screens/diseases/DiseaseListScreen';
import { DiseaseDetailScreen } from '../screens/diseases/DiseaseDetailScreen';

export type RootStackParamList = {
    // Auth
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    TruecallerLogin: undefined;

    // Main
    MainApp: undefined;
    HarvestLog: { pondId: string; pondName: string; cropId?: string };

    // Phase 2
    CreateFarm: undefined;
    FarmDetail: { farmId: string; farmName?: string };
    CreatePond: { farmId: string };
    PondDashboard: { pondId: string; pondName?: string };
    CreateCycle: { pondId: string };
    CycleDetail: { cycleId: string };

    // Phase 3
    WaterQualityLog: { pondId: string; pondName?: string; cropId?: string };
    FeedLog: { pondId: string; pondName?: string; cropId?: string };
    SamplingLog: { pondId: string; pondName?: string; cropId?: string };
    TreatmentLog: { pondId: string; pondName?: string; cropId?: string };
    MortalityLog: { pondId: string; pondName?: string; cropId?: string };
    ChemicalLog: { pondId: string; pondName?: string; cropId?: string };
    PlanktonLog: { pondId: string; pondName?: string; cropId?: string };
    MicrobiologyLog: { pondId: string; pondName?: string; cropId?: string };
    DiseaseLog: { pondId: string; pondName?: string; cropId?: string };

    // Phase 4
    CalculatorHub: undefined;
    CultivationPerformance: undefined;
    DailyFeedCalculator: undefined;
    ProductAmount: undefined;
    FreeAmmonia: undefined;

    SimulationList: undefined;
    SimulationCreate: undefined;
    SimulationResults: { simulationId?: string; resultData?: any };

    // Phase 5 (History & Polish)
    WaterQualityHistory: { pondId: string; pondName?: string; cropId?: string };
    FeedHistory: { pondId: string; pondName?: string; cropId?: string };
    SamplingHistory: { pondId: string; pondName?: string; cropId?: string };
    TreatmentHistory: { pondId: string; pondName?: string; cropId?: string };
    HarvestHistory: { pondId: string; cycleId?: string; cropId?: string };
    ChemicalHistory: { pondId: string; cropId?: string };
    PlanktonHistory: { pondId: string; cropId?: string };
    MicrobiologyHistory: { pondId: string; cropId?: string };
    DiseaseHistory: { pondId: string; cropId?: string };
    MortalityHistory: { pondId: string; cropId?: string };

    Profile: undefined;
    Settings: undefined;
    Notifications: undefined;
    Help: undefined;
    About: undefined;
    Inventory: undefined;
    InventoryDetail: { inventoryId: string; itemName?: string };

    // Disease Encyclopedia
    DiseaseList: undefined;
    DiseaseDetail: { diseaseId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const { isLoading, isAuthenticated, initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.roles.light.background }}>
                <ActivityIndicator size="large" color={theme.roles.light.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: theme.roles.light.background },
            }}
        >
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPasswordScreen}
                        options={{ headerShown: true, title: 'Forgot Password', headerTintColor: theme.roles.light.primary }}
                    />
                    <Stack.Screen
                        name="TruecallerLogin"
                        component={TruecallerLoginScreen}
                        options={{ headerShown: true, title: 'Sign in with Truecaller', headerTintColor: theme.roles.light.primary }}
                    />
                </>
            ) : (
                <>
                    <Stack.Screen name="MainApp" component={MainNavigator} />

                    <Stack.Screen name="CreateFarm" component={CreateFarmScreen} />
                    <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
                    <Stack.Screen name="CreatePond" component={CreatePondScreen} />
                    <Stack.Screen name="PondDashboard" component={PondDashboardScreen} />
                    <Stack.Screen name="CreateCycle" component={CreateCycleScreen} />
                    <Stack.Screen name="CycleDetail" component={CycleDetailScreen} />

                    <Stack.Screen name="WaterQualityLog" component={WaterQualityLogScreen} />
                    <Stack.Screen name="FeedLog" component={FeedLogScreen} />
                    <Stack.Screen name="SamplingLog" component={SamplingLogScreen} />
                    <Stack.Screen name="TreatmentLog" component={TreatmentLogScreen} />
                <Stack.Screen name="HarvestLog" component={HarvestLogScreen} />
                    <Stack.Screen name="MortalityLog" component={MortalityLogScreen} />
                    <Stack.Screen name="ChemicalLog" component={ChemicalLogScreen} />
                    <Stack.Screen name="PlanktonLog" component={PlanktonLogScreen} />
                    <Stack.Screen name="MicrobiologyLog" component={MicrobiologyLogScreen} />
                    <Stack.Screen name="DiseaseLog" component={DiseaseLogScreen} />

                    {/* Phase 4 */}
                    <Stack.Screen name="CalculatorHub" component={CalculatorHubScreen} />
                    <Stack.Screen name="CultivationPerformance" component={CultivationPerformanceScreen} />
                    <Stack.Screen name="DailyFeedCalculator" component={DailyFeedCalculatorScreen} />
                    <Stack.Screen name="ProductAmount" component={ProductAmountScreen} />
                    <Stack.Screen name="FreeAmmonia" component={FreeAmmoniaScreen} />

                    <Stack.Screen name="SimulationList" component={SimulationListScreen} />
                    <Stack.Screen name="SimulationCreate" component={SimulationCreateScreen} />
                    <Stack.Screen name="SimulationResults" component={SimulationResultsScreen} />

                    {/* Phase 5 (History) */}
                    <Stack.Screen name="WaterQualityHistory" component={WaterQualityHistoryScreen} />
                    <Stack.Screen name="FeedHistory" component={FeedHistoryScreen} />
                    <Stack.Screen name="SamplingHistory" component={SamplingHistoryScreen} />
                    <Stack.Screen name="TreatmentHistory" component={TreatmentHistoryScreen} />
                    <Stack.Screen name="HarvestHistory" component={HarvestHistoryScreen} />
                    <Stack.Screen name="ChemicalHistory" component={ChemicalHistoryScreen} />
                    <Stack.Screen name="PlanktonHistory" component={PlanktonHistoryScreen} />
                    <Stack.Screen name="MicrobiologyHistory" component={MicrobiologyHistoryScreen} />
                    <Stack.Screen name="DiseaseHistory" component={DiseaseHistoryScreen} />
                    <Stack.Screen name="MortalityHistory" component={MortalityHistoryScreen} />

                    {/* Phase 5 (Settings & Notifications) */}
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="Notifications" component={NotificationsScreen} />
                    <Stack.Screen name="Help" component={HelpScreen} />
                    <Stack.Screen name="About" component={AboutScreen} />
                    <Stack.Screen name="Inventory" component={InventoryListScreen} />
                    <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />

                    {/* Disease Encyclopedia */}
                    <Stack.Screen name="DiseaseList" component={DiseaseListScreen} />
                    <Stack.Screen name="DiseaseDetail" component={DiseaseDetailScreen} />
                </>
            )}
        </Stack.Navigator>
    );
};

export default RootNavigator;
