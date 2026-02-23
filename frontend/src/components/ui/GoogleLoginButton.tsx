import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from './Button';
import { Colors, spacing } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    onPress: () => void;
    loading?: boolean;
}

export const GoogleLoginButton = ({ onPress, loading }: Props) => {
    return (
        <Button
            title="Continue with Google"
            onPress={onPress}
            loading={loading}
            variant="outlined"
            icon={<MaterialCommunityIcons name="google" size={20} color={Colors.textPrimary} />}
            style={styles.button}
            textStyle={styles.text}
        />
    );
};

const styles = StyleSheet.create({
    button: {
        borderColor: Colors.border,
        borderWidth: 1,
        backgroundColor: Colors.surface,
        marginTop: spacing.md,
    },
    text: {
        color: Colors.textPrimary,
    },
});
