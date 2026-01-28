import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import { RootStackParamList } from './types';

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

// Disease
import DiseaseLibraryScreen from '../screens/features/disease/DiseaseLibraryScreen';
import DiseaseDetailScreen from '../screens/features/disease/DiseaseDetailScreen';
import DiseaseRecordScreen from '../screens/features/disease/DiseaseRecordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
            <Stack.Screen name="Main" component={BottomTabNavigator} />
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
