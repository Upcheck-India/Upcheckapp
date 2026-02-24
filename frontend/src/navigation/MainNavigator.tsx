import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

// Import screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { FarmsListScreen } from '../screens/farms/FarmsListScreen';

// Phase 4 & 5 placeholders (to be built later)
import { View, Text } from 'react-native';
const PlaceholderScreen = ({ title }: { title: string }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{title} (Coming Soon)</Text>
    </View>
);

const ReportsScreen = () => <PlaceholderScreen title="Reports" />;
const MoreScreen = () => <PlaceholderScreen title="More" />;

const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
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
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Farms"
                component={FarmsListScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="barn" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-box" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="More"
                component={MoreScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="menu" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
