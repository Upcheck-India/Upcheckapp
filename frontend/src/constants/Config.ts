import Constants from 'expo-constants';

/**
 * Global Configuration
 */
export const Config = {
    API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl || 'http://192.168.31.160:8080/api',
};
