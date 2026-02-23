import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { theme } from '../../theme';

interface ChartProps {
    data: {
        labels: string[];
        datasets: {
            data: number[];
            color?: (opacity: number) => string;
        }[];
    };
    yAxisLabel?: string;
    yAxisSuffix?: string;
    width?: number;
    height?: number;
}

export const LineChart: React.FC<ChartProps> = ({
    data,
    yAxisLabel = '',
    yAxisSuffix = '',
    width = Dimensions.get('window').width - 32,
    height = 220
}) => {
    return (
        <View style={styles.container}>
            <RNLineChart
                data={data}
                width={width}
                height={height}
                yAxisLabel={yAxisLabel}
                yAxisSuffix={yAxisSuffix}
                yAxisInterval={1}
                chartConfig={{
                    backgroundColor: theme.roles.light.surface,
                    backgroundGradientFrom: theme.roles.light.surface,
                    backgroundGradientTo: theme.roles.light.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(3, 218, 198, ${opacity})`, // Using primary color
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    style: {
                        borderRadius: 8
                    },
                    propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: theme.roles.light.primary
                    }
                }}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 8
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
