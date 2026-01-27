import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card, CardProps } from 'react-native-paper';
import { Layout } from '../constants/Layout';
import { Colors } from '../constants/Colors';

interface AppCardProps extends CardProps {
    style?: ViewStyle;
    children: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({ style, children, elevation, ...props }) => {
    return (
        <Card mode="elevated" elevation={elevation || (Layout.cardElevation as any)} style={[styles.card, style]} {...props}>
            {children}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: Layout.margin,
        borderRadius: Layout.borderRadius,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.lightGrey,
    }
});
