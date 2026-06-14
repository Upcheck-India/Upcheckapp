import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../../theme';

interface MoonDiagramProps {
  /** Phase 0=new … 0.5=full … →1=new. */
  phase: number;
  size?: number;
}

/** Path of the lit region of the moon for a given phase (pure geometry). */
function litPath(cx: number, cy: number, r: number, phase: number): string {
  const x = Math.cos(2 * Math.PI * phase) * r; // signed terminator radius
  const waxing = phase <= 0.5;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = x > 0 ? outerSweep : 1 - outerSweep;
  const rx = Math.abs(x);
  return [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r}`,
    `A ${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r}`,
    'Z',
  ].join(' ');
}

/**
 * A clean vector moon-phase diagram (no images/emoji): a dark disc with the
 * illuminated fraction drawn as a precise lit path.
 */
export const MoonDiagram: React.FC<MoonDiagramProps> = ({ phase, size = 96 }) => {
  const r = size / 2 - 2;
  const c = size / 2;
  const lit = theme.roles.light.textBrand;
  const dark = theme.roles.light.surfaceVariant;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} fill={dark} stroke={theme.roles.light.borderDefault} strokeWidth={1} />
      <Path d={litPath(c, c, r, phase)} fill={lit} />
      <Circle cx={c} cy={c} r={r} fill="none" stroke={theme.roles.light.borderDefault} strokeWidth={1} />
    </Svg>
  );
};

export default MoonDiagram;
