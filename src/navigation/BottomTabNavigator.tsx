import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen, NewsScreen, EShopScreen, AlertsScreen, ProfileScreen } from '../screens/main/TabScreens';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/Colors';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
            initialRouteName="Crop"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.grey,
                tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.lightGrey },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'News') {
                        iconName = 'newspaper';
                    } else if (route.name === 'eShop') {
                        iconName = 'shopping';
                    } else if (route.name === 'Crop') {
                        iconName = 'sprout'; // Center icon, maybe different styling
                    } else if (route.name === 'Alerts') {
                        iconName = 'bell';
                    } else if (route.name === 'Personal') {
                        iconName = 'account';
                    }

                    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="News" component={NewsScreen} />
            <Tab.Screen name="eShop" component={EShopScreen} />
            <Tab.Screen name="Crop" component={DashboardScreen} />
            <Tab.Screen name="Alerts" component={AlertsScreen} />
            <Tab.Screen name="Personal" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
