import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../screens/auth/LoginScreen';
import { RootStackParamList } from './types';

import { Colors } from '../constants/Colors';

import BottomTabNavigator from './BottomTabNavigator';

import MineralCalculatorScreen from '../screens/features/MineralCalculatorScreen';
import ShrimpCalculatorScreen from '../screens/features/ShrimpCalculatorScreen';
import SimulationScreen from '../screens/features/SimulationScreen';
import HarvestPlanningScreen from '../screens/features/HarvestPlanningScreen';

import FarmManagementScreen from '../screens/features/FarmManagementScreen';
import PondManagementScreen from '../screens/features/PondManagementScreen';
import ProductDetailScreen from '../screens/features/ProductDetailScreen';

// Calculators
import CalculatorsMenuScreen from '../screens/features/calculators/CalculatorsMenuScreen';
import CultivationPerformanceScreen from '../screens/features/calculators/CultivationPerformanceScreen';
import FreeAmmoniaScreen from '../screens/features/calculators/FreeAmmoniaScreen';
import ProductDosageScreen from '../screens/features/calculators/ProductDosageScreen';

// Data Entry
import DataEntryMenuScreen from '../screens/features/data-entry/DataEntryMenuScreen';
import ChemicalEntryScreen from '../screens/features/data-entry/ChemicalEntryScreen';
import PlanktonEntryScreen from '../screens/features/data-entry/PlanktonEntryScreen';
import MicrobiologyEntryScreen from '../screens/features/data-entry/MicrobiologyEntryScreen';
import MortalityEntryScreen from '../screens/features/data-entry/MortalityEntryScreen';

// Auth Screens
import TwoFALoginScreen from '../screens/auth/TwoFALoginScreen';
import TwoFASetupScreen from '../screens/auth/TwoFASetupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import SessionManagementScreen from '../screens/auth/SessionManagementScreen';

// Disease
import DiseaseLibraryScreen from '../screens/features/disease/DiseaseLibraryScreen';
import DiseaseDetailScreen from '../screens/features/disease/DiseaseDetailScreen';
import DiseaseRecordScreen from '../screens/features/disease/DiseaseRecordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';

const RootNavigator = () => {
    const { isLoading, isAuthenticated, checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, []);

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
            screenOptions={{ headerShown: false }}
        >
            {/* Auth Screens - only show when not authenticated */}
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="TwoFALogin" component={TwoFALoginScreen} options={{ presentation: 'modal' }} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                </>
            ) : null}

            {/* Main App Screens */}
            <Stack.Screen name="Main" component={BottomTabNavigator} />

            {/* Auth Protected Screens */}
            <Stack.Screen name="TwoFASetup" component={TwoFASetupScreen} options={{ headerShown: true, title: 'Two-Factor Authentication' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />
            <Stack.Screen name="SessionManagement" component={SessionManagementScreen} options={{ headerShown: true, title: 'Active Sessions' }} />

            <Stack.Screen name="MineralCalculator" component={MineralCalculatorScreen} options={{ headerShown: true, title: 'Minerals' }} />
            <Stack.Screen name="ShrimpCalculator" component={ShrimpCalculatorScreen} options={{ headerShown: true, title: 'Shrimp Calculator' }} />
            <Stack.Screen name="Simulation" component={SimulationScreen} options={{ headerShown: true, title: 'Farm Simulation' }} />
            <Stack.Screen name="HarvestPlanning" component={HarvestPlanningScreen} options={{ headerShown: true, title: 'Harvest Planning' }} />
            <Stack.Screen name="FarmManagement" component={FarmManagementScreen} options={{ headerShown: true, title: 'Farms' }} />
            <Stack.Screen name="PondManagement" component={PondManagementScreen} options={{ headerShown: true, title: 'Ponds' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Product Details' }} />

            {/* Calculators Group */}
            <Stack.Screen name="CalculatorsMenu" component={CalculatorsMenuScreen} options={{ headerShown: true, title: 'Calculators' }} />
            <Stack.Screen name="CultivationPerformance" component={CultivationPerformanceScreen} options={{ headerShown: true, title: 'Cultivation Performance' }} />
            <Stack.Screen name="FreeAmmonia" component={FreeAmmoniaScreen} options={{ headerShown: true, title: 'Free Ammonia' }} />
            <Stack.Screen name="ProductDosage" component={ProductDosageScreen} options={{ headerShown: true, title: 'Product Dosage' }} />

            {/* Data Entry Group */}
            <Stack.Screen name="DataEntryMenu" component={DataEntryMenuScreen} options={{ headerShown: true, title: 'Data Entry' }} />
            <Stack.Screen name="ChemicalEntry" component={ChemicalEntryScreen} options={{ headerShown: true, title: 'Input Chemical Data' }} />
            <Stack.Screen name="PlanktonEntry" component={PlanktonEntryScreen} options={{ headerShown: true, title: 'Input Plankton Data' }} />
            <Stack.Screen name="MicrobiologyEntry" component={MicrobiologyEntryScreen} options={{ headerShown: true, title: 'Input Microbiology Data' }} />
            <Stack.Screen name="MortalityEntry" component={MortalityEntryScreen} options={{ headerShown: true, title: 'Record Mortality' }} />

            {/* Disease Group */}
            <Stack.Screen name="DiseaseLibrary" component={DiseaseLibraryScreen} options={{ headerShown: true, title: 'Disease Library' }} />
            <Stack.Screen name="DiseaseDetail" component={DiseaseDetailScreen} options={{ headerShown: true, title: 'Disease Details' }} />
            <Stack.Screen name="DiseaseRecord" component={DiseaseRecordScreen} options={{ headerShown: true, title: 'Record Disease' }} />
        </Stack.Navigator>
    );
};

export default RootNavigator;
