import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import { RootStackParamList } from './types';

import BottomTabNavigator from './BottomTabNavigator';

import MineralCalculatorScreen from '../screens/features/MineralCalculatorScreen';
import ShrimpCalculatorScreen from '../screens/features/ShrimpCalculatorScreen';

import FarmManagementScreen from '../screens/features/FarmManagementScreen';
import PondManagementScreen from '../screens/features/PondManagementScreen';
import ProductDetailScreen from '../screens/features/ProductDetailScreen';

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
            <Stack.Screen name="FarmManagement" component={FarmManagementScreen} options={{ headerShown: true, title: 'Farms' }} />
            <Stack.Screen name="PondManagement" component={PondManagementScreen} options={{ headerShown: true, title: 'Ponds' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Product Details' }} />
        </Stack.Navigator>
    );
};

export default RootNavigator;
