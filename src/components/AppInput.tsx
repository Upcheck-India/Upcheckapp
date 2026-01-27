import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';
import { Layout } from '../constants/Layout';
import { Colors } from '../constants/Colors';

interface AppInputProps extends TextInputProps {
    style?: ViewStyle;
}

export const AppInput: React.FC<AppInputProps> = ({ style, ...props }) => {
    return (
        <TextInput
            mode="outlined"
            style={[styles.input, style]}
            activeOutlineColor={Colors.primary}
            outlineColor={Colors.border}
            textColor={Colors.text}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    input: {
        marginBottom: Layout.margin,
        backgroundColor: Colors.surface,
    }
});
