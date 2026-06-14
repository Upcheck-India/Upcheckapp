import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { theme } from '../../theme';

interface GaugeArcProps {
  /** Normalized value 0..1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Arc color; defaults to brand. */
  color?: string;
  trackColor?: string;
  /** Large centered value text. */
  centerLabel?: string;
  /** Small caption under the value. */
  caption?: string;
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

/** Describe a 180°→0° (left-to-right) semicircular arc path for a fraction t. */
const arcPath = (cx: number, cy: number, r: number, t: number) => {
  const start = polar(cx, cy, r, 180);
  const end = polar(cx, cy, r, 180 - 180 * Math.max(0, Math.min(1, t)));
  const largeArc = 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

/**
 * A clean semicircular vector gauge (no images/emoji) — used for adequacy and
 * risk readouts. Renders a track arc + a coloured value arc + centred value.
 */
export const GaugeArc: React.FC<GaugeArcProps> = ({
  value,
  size = 180,
  strokeWidth = 14,
  color = theme.roles.light.primary,
  trackColor = theme.roles.light.borderDefault,
  centerLabel,
  caption,
}) => {
  const w = size;
  const h = size / 2 + strokeWidth;
  const cx = w / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth / 2;
  const endCap = polar(cx, cy, r, 180 - 180 * Math.max(0, Math.min(1, value)));

  return (
    <View style={{ width: w, alignItems: 'center' }}>
      <Svg width={w} height={h}>
        <Path d={arcPath(cx, cy, r, 1)} stroke={trackColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        <Path d={arcPath(cx, cy, r, value)} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        <Circle cx={endCap.x} cy={endCap.y} r={strokeWidth / 2 + 1} fill={color} />
      </Svg>
      <View style={[styles.center, { top: cy - 18 }]}>
        {centerLabel != null && <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color }]}>{centerLabel}</Text>}
        {caption != null && <Text numberOfLines={1} style={styles.caption}>{caption}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 8 },
  value: { ...theme.typeScale.numericLarge, color: theme.roles.light.textPrimary },
  caption: { ...theme.typeScale.caption, color: theme.roles.light.textSecondary, marginTop: 2 },
});

export default GaugeArc;
