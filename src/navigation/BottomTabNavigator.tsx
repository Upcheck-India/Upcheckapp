import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen, NewsScreen, EShopScreen, AlertsScreen, ProfileScreen } from '../screens/main/TabScreens';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/Colors';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
            initialRouteName="Pond"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.grey,
                tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.lightGrey },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'News') {
                        iconName = 'newspaper-variant-outline';
                    } else if (route.name === 'eShop') {
                        iconName = 'store';
                    } else if (route.name === 'Pond') {
                        iconName = 'fishbowl-outline'; // Center icon - aquaculture themed
                    } else if (route.name === 'Alerts') {
                        iconName = 'bell-ring-outline';
                    } else if (route.name === 'Profile') {
                        iconName = 'account-circle-outline';
                    }

                    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="News" component={NewsScreen} />
            <Tab.Screen name="eShop" component={EShopScreen} />
            <Tab.Screen name="Pond" component={DashboardScreen} />
            <Tab.Screen name="Alerts" component={AlertsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
