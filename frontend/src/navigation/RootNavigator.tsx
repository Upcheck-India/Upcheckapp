import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from './types';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

import BottomTabNavigator from './BottomTabNavigator';

// Auth Screens
// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
// import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
// import TwoFALoginScreen from '../screens/auth/TwoFALoginScreen';
import TwoFASetupScreen from '../screens/auth/TwoFASetupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import SessionManagementScreen from '../screens/auth/SessionManagementScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Feature Screens
import MineralCalculatorScreen from '../screens/features/MineralCalculatorScreen';
import ShrimpCalculatorScreen from '../screens/features/ShrimpCalculatorScreen';
import SimulationScreen from '../screens/features/SimulationScreen';
import HarvestPlanningScreen from '../screens/features/HarvestPlanningScreen';
import FarmManagementScreen from '../screens/features/FarmManagementScreen';
import PondManagementScreen from '../screens/features/PondManagementScreen';
import PondDetailScreen from '../screens/features/PondDetailScreen';
import CycleManagementScreen from '../screens/features/CycleManagementScreen';
import ProductDetailScreen from '../screens/features/ProductDetailScreen';

// Calculators
import CalculatorsMenuScreen from '../screens/features/calculators/CalculatorsMenuScreen';
import CultivationPerformanceScreen from '../screens/features/calculators/CultivationPerformanceScreen';
import FreeAmmoniaScreen from '../screens/features/calculators/FreeAmmoniaScreen';
import ProductDosageScreen from '../screens/features/calculators/ProductDosageScreen';

// Data Entry
import DataEntryMenuScreen from '../screens/features/data-entry/DataEntryMenuScreen';
import FeedEntryScreen from '../screens/features/data-entry/FeedEntryScreen';
import SamplingEntryScreen from '../screens/features/data-entry/SamplingEntryScreen';
import ChemicalEntryScreen from '../screens/features/data-entry/ChemicalEntryScreen';
import PlanktonEntryScreen from '../screens/features/data-entry/PlanktonEntryScreen';
import MicrobiologyEntryScreen from '../screens/features/data-entry/MicrobiologyEntryScreen';
import MortalityEntryScreen from '../screens/features/data-entry/MortalityEntryScreen';

// Disease
import DiseaseLibraryScreen from '../screens/features/disease/DiseaseLibraryScreen';
import DiseaseDetailScreen from '../screens/features/disease/DiseaseDetailScreen';
import DiseaseRecordScreen from '../screens/features/disease/DiseaseRecordScreen';

// Harvest
import HarvestEntryScreen from '../screens/features/harvest/HarvestEntryScreen';
import HarvestHistoryScreen from '../screens/features/harvest/HarvestHistoryScreen';

// Finance
import ExpenseEntryScreen from '../screens/features/finance/ExpenseEntryScreen';

// Inventory
import InventoryScreen from '../screens/features/inventory/InventoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const { isLoading, isAuthenticated } = useAuth();

    // Show loading screen while checking auth state
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator
            initialRouteName={isAuthenticated ? "Main" : "Login"}
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.primary,
                headerTitleStyle: { color: Colors.text, fontWeight: '600' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            {/* ─── Auth Screens (unauthenticated) ─────────────────── */}
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    {/* Phone and 2FA are not in current plan, commenting out to avoid errors if implementations are missing or broken
                    <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
                    <Stack.Screen name="TwoFALogin" component={TwoFALoginScreen} options={{ presentation: 'modal' }} />
                    */}
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                </>
            ) : null}

            {/* ─── Main App ───────────────────────────────────────── */}
            {isAuthenticated ? (
                <>
                    <Stack.Screen name="Main" component={BottomTabNavigator} />

                    {/* ─── Auth Settings (authenticated) ──────────────────── */}
                    <Stack.Screen name="TwoFASetup" component={TwoFASetupScreen} options={{ headerShown: true, title: 'Two-Factor Authentication' }} />
                    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
                    <Stack.Screen name="SessionManagement" component={SessionManagementScreen} options={{ headerShown: true, title: 'Active Sessions' }} />
                    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />

                    {/* ─── Feature Screens ─────────────────────────────────── */}
                    <Stack.Screen name="MineralCalculator" component={MineralCalculatorScreen} options={{ headerShown: true, title: 'Minerals' }} />
                    <Stack.Screen name="ShrimpCalculator" component={ShrimpCalculatorScreen} options={{ headerShown: true, title: 'Shrimp Calculator' }} />
                    <Stack.Screen name="Simulation" component={SimulationScreen} options={{ headerShown: true, title: 'Farm Simulation' }} />
                    <Stack.Screen name="HarvestPlanning" component={HarvestPlanningScreen} options={{ headerShown: true, title: 'Harvest Planning' }} />
                    <Stack.Screen name="FarmManagement" component={FarmManagementScreen} options={{ headerShown: true, title: 'Farms' }} />
                    <Stack.Screen name="PondManagement" component={PondManagementScreen} options={{ headerShown: true, title: 'Ponds' }} />
                    <Stack.Screen name="PondDetail" component={PondDetailScreen} options={{ headerShown: true, title: 'Pond Details' }} />
                    <Stack.Screen name="CycleManagement" component={CycleManagementScreen} options={{ headerShown: true, title: 'Production Cycles' }} />
                    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Product Details' }} />

                    {/* ─── Calculators ─────────────────────────────────────── */}
                    <Stack.Screen name="CalculatorsMenu" component={CalculatorsMenuScreen} options={{ headerShown: true, title: 'Calculators' }} />
                    <Stack.Screen name="CultivationPerformance" component={CultivationPerformanceScreen} options={{ headerShown: true, title: 'Cultivation Performance' }} />
                    <Stack.Screen name="FreeAmmonia" component={FreeAmmoniaScreen} options={{ headerShown: true, title: 'Free Ammonia' }} />
                    <Stack.Screen name="ProductDosage" component={ProductDosageScreen} options={{ headerShown: true, title: 'Product Dosage' }} />

                    {/* ─── Data Entry ──────────────────────────────────────── */}
                    <Stack.Screen name="DataEntryMenu" component={DataEntryMenuScreen} options={{ headerShown: true, title: 'Data Entry' }} />
                    <Stack.Screen name="FeedEntry" component={FeedEntryScreen} options={{ headerShown: true, title: 'Feed Entry' }} />
                    <Stack.Screen name="SamplingEntry" component={SamplingEntryScreen} options={{ headerShown: true, title: 'Sampling Entry' }} />
                    <Stack.Screen name="ChemicalEntry" component={ChemicalEntryScreen} options={{ headerShown: true, title: 'Input Chemical Data' }} />
                    <Stack.Screen name="PlanktonEntry" component={PlanktonEntryScreen} options={{ headerShown: true, title: 'Input Plankton Data' }} />
                    <Stack.Screen name="MicrobiologyEntry" component={MicrobiologyEntryScreen} options={{ headerShown: true, title: 'Input Microbiology Data' }} />
                    <Stack.Screen name="MortalityEntry" component={MortalityEntryScreen} options={{ headerShown: true, title: 'Record Mortality' }} />

                    {/* ─── Disease ─────────────────────────────────────────── */}
                    <Stack.Screen name="DiseaseLibrary" component={DiseaseLibraryScreen} options={{ headerShown: true, title: 'Disease Library' }} />
                    <Stack.Screen name="DiseaseDetail" component={DiseaseDetailScreen} options={{ headerShown: true, title: 'Disease Details' }} />
                    <Stack.Screen name="DiseaseRecord" component={DiseaseRecordScreen} options={{ headerShown: true, title: 'Record Disease' }} />

                    {/* ─── Harvest ─────────────────────────────────────────── */}
                    <Stack.Screen name="HarvestEntry" component={HarvestEntryScreen} options={{ headerShown: true, title: 'Record Harvest' }} />
                    <Stack.Screen name="HarvestHistory" component={HarvestHistoryScreen} options={{ headerShown: true, title: 'Harvest History' }} />

                    {/* ─── Finance ─────────────────────────────────────────── */}
                    <Stack.Screen name="ExpenseEntry" component={ExpenseEntryScreen} options={{ headerShown: true, title: 'Record Expense' }} />

                    {/* ─── Inventory ───────────────────────────────────────── */}
                    <Stack.Screen name="Inventory" component={InventoryScreen} options={{ headerShown: true, title: 'Inventory' }} />
                </>
            ) : null}
        </Stack.Navigator>
    );
};

export default RootNavigator;
