import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

// Import screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { FarmsListScreen } from '../screens/farms/FarmsListScreen';
import { ReportsScreen } from '../screens/main/ReportsScreen';
import { MoreScreen } from '../screens/main/MoreScreen';

const Tab = createBottomTabNavigator();

/** Placeholder for the center "+" slot — never rendered (the button opens the
 *  Quick Log modal instead of switching tabs). */
const NoopScreen = () => null;

/** Elevated center action button — one-tap entry to the daily logging flow. */
const QuickLogButton = () => {
    const navigation = useNavigation<any>();
    return (
        <View style={styles.centerSlot} pointerEvents="box-none">
            <TouchableOpacity
                activeOpacity={0.85}
                accessibilityLabel="Quick log"
                onPress={() => navigation.navigate('QuickLog')}
                style={styles.centerTouch}
            >
                <LinearGradient
                    colors={theme.gradients.brand.colors as [string, string, ...string[]]}
                    start={theme.gradients.brand.start}
                    end={theme.gradients.brand.end}
                    style={styles.centerFab}
                >
                    <MaterialCommunityIcons name="plus" size={30} color={theme.roles.light.textInverse} />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

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
            {/* Center quick-log action — opens the Quick Log modal, never a tab. */}
            <Tab.Screen
                name="QuickLogTab"
                component={NoopScreen}
                options={{
                    tabBarLabel: () => null,
                    tabBarButton: () => <QuickLogButton />,
                }}
                listeners={{ tabPress: (e) => e.preventDefault() }}
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

const styles = StyleSheet.create({
    centerSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    centerTouch: {
        // Lift the FAB above the tab bar so it reads as the primary action.
        top: -18,
    },
    centerFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: theme.roles.light.surface,
        ...theme.shadows.brandGlow,
    },
});
