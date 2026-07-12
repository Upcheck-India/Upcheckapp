// theme/index.ts — complete exportable theme object

import { typeScale } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { tokens } from './tokens';
import { gradients } from './gradients';
import { light } from './colorRoles';

// TODO: The `colors` key below currently points to the `light` semantic roles.
// To fully support dark mode, this should be accessed via a `useTheme` hook,
// but for static styling we expose the light theme as default.

export const theme = {
    colors: light,
    typeScale,
    spacing,
    radius,
    shadows,
    tokens,
    gradients,
    roles: { light },
} as const;

export type Theme = typeof theme;

// Re-export old Colors to prevent immediate breakage before refactoring
export const Colors = light;
export const typography = typeScale;
export { spacing, radius, shadows };
