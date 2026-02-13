import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import { Layout } from '../constants/Layout';
import { Colors } from '../constants/Colors';

interface AppCardProps {
    style?: ViewStyle;
    children: React.ReactNode;
    onPress?: () => void;
}

export const AppCard: React.FC<AppCardProps> = ({ style, children, onPress }) => {
    return (
        <Card style={[styles.card, style] as any} onPress={onPress}>
            {children}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: Layout.margin,
        borderRadius: Layout.radius.lg,
        backgroundColor: Colors.cardBackground,
        ...Layout.shadow.lg,
    },
});
