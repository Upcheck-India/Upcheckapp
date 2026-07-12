/**
 * App-wide font-scaling defaults (docs/UI_UX_AUDIT.md Tier 1 #4).
 *
 * `allowFontScaling` was previously handled on ZERO components anywhere in
 * the app (confirmed by a full-repo grep) — meaning a farmer with an
 * OS-level large-font accessibility setting (common on older phones/users,
 * exactly this app's target demographic) got React Native's un-capped
 * default scaling everywhere, which clips text in the app's many fixed-size
 * chips, badges, and metric tiles at 150–200% system font sizes.
 *
 * Rather than sweeping every screen (a huge, error-prone diff), set a single
 * global default here: text still scales with the OS setting so screen
 * readers and low-vision users get real accessibility benefit
 * (`allowFontScaling: true`, the RN default), but scaling is capped
 * (`maxFontSizeMultiplier`) so a fixed-size chip/badge doesn't overflow its
 * container at extreme OS font settings. Import this once, for its side
 * effect, before any screen renders (see App.tsx).
 */
import { Text, TextInput } from 'react-native';

const MAX_FONT_SCALE = 1.3;

(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = true;
(Text as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = true;
(TextInput as any).defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
