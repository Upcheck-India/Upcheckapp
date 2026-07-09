import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reportError } from '../utils/reportError';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        reportError(error, { componentStack: errorInfo.componentStack });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E03535" />
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            The app encountered an unexpected error. Please try again.
                        </Text>

                        {__DEV__ && this.state.error && (
                            <ScrollView style={styles.errorBox}>
                                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                            </ScrollView>
                        )}

                        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Try again">
                            <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F8FA',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 320,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A222B',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#3E5163',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    errorBox: {
        backgroundColor: '#FDF0F0',
        borderRadius: 8,
        padding: 12,
        maxHeight: 120,
        width: '100%',
        marginBottom: 24,
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#A41B1B',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0D84D6',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
