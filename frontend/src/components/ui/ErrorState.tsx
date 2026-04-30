import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { theme } from '../../theme';

interface ErrorStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
    title?: string;
    message?: string;
    retryLabel?: string;
    onRetry?: () => void;
    error?: any;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    icon = 'alert-circle-outline',
    title = 'Something went wrong',
    message,
    retryLabel = 'Try Again',
    onRetry,
    error,
}) => {
    // Extract error message from various error formats
    const errorMessage = message ||
        (error?.response?.data?.message) ||
        (error?.message) ||
        'An unexpected error occurred. Please check your connection and try again.';

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon} size={64} color={theme.roles.light.dangerText} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{errorMessage}</Text>
            {onRetry && (
                <Button
                    title={retryLabel}
                    onPress={onRetry}
                    variant="outlined"
                    style={styles.button}
                    icon="refresh"
                />
            )}
        </View>
    );
};

interface NetworkErrorProps {
    onRetry?: () => void;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry }) => (
    <ErrorState
        icon="wifi-off"
        title="No Internet Connection"
        message="Please check your network connection and try again."
        onRetry={onRetry}
    />
);

interface ServerErrorProps {
    onRetry?: () => void;
}

export const ServerError: React.FC<ServerErrorProps> = ({ onRetry }) => (
    <ErrorState
        icon="server-network-off"
        title="Server Error"
        message="Our servers are experiencing issues. Please try again later."
        onRetry={onRetry}
    />
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing[8],
        backgroundColor: theme.roles.light.background,
    },
    iconContainer: {
        marginBottom: theme.spacing[6],
        backgroundColor: theme.roles.light.dangerBg,
        borderRadius: 50,
        padding: theme.spacing[4],
    },
    title: {
        ...theme.typeScale.h2,
        color: theme.roles.light.textPrimary,
        marginBottom: theme.spacing[3],
        textAlign: 'center',
    },
    message: {
        ...theme.typeScale.bodyLarge,
        color: theme.roles.light.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing[6],
        lineHeight: 24,
    },
    button: {
        marginTop: theme.spacing[4],
        borderColor: theme.roles.light.primary,
    },
});