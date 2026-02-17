import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DashboardScreen from './DashboardScreen';
import ProfileScreen from './ProfileScreen';
import NewsScreen from './NewsScreen';
import { AlertsScreen } from './AlertsScreen';
import EShopScreen from '../features/EShopScreen';

export { DashboardScreen, ProfileScreen, NewsScreen, AlertsScreen, EShopScreen };

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
