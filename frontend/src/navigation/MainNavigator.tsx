import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

// Import screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { FarmsListScreen } from '../screens/farms/FarmsListScreen';
import { ReportsScreen } from '../screens/main/ReportsScreen';
import { MoreScreen } from '../screens/main/MoreScreen';

const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.tokens.tabBar.activeColor,
                tabBarInactiveTintColor: theme.tokens.tabBar.inactiveColor,
                tabBarStyle: {
                    backgroundColor: theme.roles.light.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.roles.light.borderDefault,
                    paddingTop: 8,
                    paddingBottom: 8,
                    height: 64,
                    ...theme.shadows.md,
                },
                tabBarLabelStyle: {
                    fontFamily: theme.tokens.tabBar.labelFontFamily,
                    fontSize: theme.tokens.tabBar.labelFontSize,
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={HomeScreen}
                options={{
                    tabBarLabel: t('common.tabDashboard'),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Farms"
                component={FarmsListScreen}
                options={{
                    tabBarLabel: t('common.tabFarms'),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="barn" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    tabBarLabel: t('common.tabReports'),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-box" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreScreen}
                options={{
                    tabBarLabel: t('common.tabMore'),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="menu" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
