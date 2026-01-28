import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card, CardProps } from 'react-native-paper';
import { Layout } from '../constants/Layout';
import { Colors } from '../constants/Colors';

interface AppCardProps extends CardProps {
    style?: ViewStyle;
    children: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({ style, children, elevation = 2, ...props }) => {
    return (
        <Card mode="elevated" elevation={elevation as any} style={[styles.card, style]} {...props}>
            {children}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: Layout.margin,
        borderRadius: 16,
        backgroundColor: Colors.surface,
        // Removed border, relying on shadow/elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4, // Android elevation
    }
});
