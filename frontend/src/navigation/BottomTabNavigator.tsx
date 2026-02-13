import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen, NewsScreen, EShopScreen, AlertsScreen, ProfileScreen } from '../screens/main/TabScreens';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/Colors';
import { Layout } from '../constants/Layout';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color }: { name: string; focused: boolean; color: string }) => (
    <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={name as any} size={24} color={color} />
        {focused && <View style={styles.activeIndicator} />}
    </View>
);

const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
            initialRouteName="Pond"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.grey,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused, color }) => {
                    let iconName = 'help-circle-outline';

                    if (route.name === 'News') iconName = focused ? 'newspaper' : 'newspaper-variant-outline';
                    else if (route.name === 'eShop') iconName = focused ? 'store' : 'store-outline';
                    else if (route.name === 'Pond') iconName = focused ? 'waves' : 'wave';
                    else if (route.name === 'Alerts') iconName = focused ? 'bell' : 'bell-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'account-circle' : 'account-circle-outline';

                    return <TabIcon name={iconName} focused={focused} color={color} />;
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

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.tabBarBackground,
        borderTopColor: Colors.tabBarBorder,
        borderTopWidth: 1,
        height: Layout.tabBarHeight,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        ...Layout.shadow.md,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
    },
    activeIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.primary,
        marginTop: 3,
    },
});

export default BottomTabNavigator;
