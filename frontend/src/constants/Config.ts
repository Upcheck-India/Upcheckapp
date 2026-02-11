import Constants from 'expo-constants';

/**
 * Global Configuration
 */
export const Config = {
    API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl || 'https://upcheckapp-c612.onrender.com/api',
};
