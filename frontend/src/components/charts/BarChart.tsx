import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { BarChart as RNBarChart } from 'react-native-chart-kit';
import { Colors } from '../../theme';

interface ChartProps {
    data: {
        labels: string[];
        datasets: {
            data: number[];
        }[];
    };
    yAxisLabel?: string;
    yAxisSuffix?: string;
    width?: number;
    height?: number;
}

export const BarChart: React.FC<ChartProps> = ({
    data,
    yAxisLabel = '',
    yAxisSuffix = '',
    width = Dimensions.get('window').width - 32,
    height = 220
}) => {
    return (
        <View style={styles.container}>
            <RNBarChart
                data={data}
                width={width}
                height={height}
                yAxisLabel={yAxisLabel}
                yAxisSuffix={yAxisSuffix}
                yAxisInterval={1}
                chartConfig={{
                    backgroundColor: Colors.surface,
                    backgroundGradientFrom: Colors.surface,
                    backgroundGradientTo: Colors.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`, // Secondary color purple style
                    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                    style: {
                        borderRadius: 8
                    },
                    barPercentage: 0.7,
                }}
                showValuesOnTopOfBars={true}
                withHorizontalLabels={true}
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
