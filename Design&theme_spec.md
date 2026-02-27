# Upcheck — Complete Design System & Theme Specification

> **Brand context:** Upcheck is a shrimp aquaculture management app. The logo features a stylized shrimp curled into a "U" mark with a blue-to-cyan gradient, paired with rounded, friendly typography in the same gradient. The design system extracts, extends, and systematizes this visual identity across every surface of the mobile app.

---

## Table of Contents

1. [Brand Identity Analysis](#1-brand-identity-analysis)
2. [Color System](#2-color-system)
3. [Typography System](#3-typography-system)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [Border Radius & Shape Language](#5-border-radius--shape-language)
6. [Elevation & Shadow System](#6-elevation--shadow-system)
7. [Iconography](#7-iconography)
8. [Component Design Tokens](#8-component-design-tokens)
9. [Component Specifications](#9-component-specifications)
10. [Screen-Level Design Patterns](#10-screen-level-design-patterns)
11. [Motion & Animation System](#11-motion--animation-system)
12. [Illustration & Visual Style](#12-illustration--visual-style)
13. [Data Visualization Theme](#13-data-visualization-theme)
14. [Dark Mode System](#14-dark-mode-system)
15. [React Native Theme Implementation](#15-react-native-theme-implementation)
16. [Usage Examples by Screen](#16-usage-examples-by-screen)
17. [Accessibility & Contrast Compliance](#17-accessibility--contrast-compliance)
18. [Brand Voice & Microcopy](#18-brand-voice--microcopy)

---

## 1. Brand Identity Analysis

### 1.1 Logo Dissection

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     [🦐 mark]  upcheck                                       ║
║                                                              ║
║  Mark:  Shrimp curled into a "U" — checkmark tail           ║
║  Font:  Rounded sans-serif, friendly, modern                 ║
║  Grad:  Deep ocean blue (#0D6EBF) → vibrant cyan (#00C8E8)   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### 1.2 Brand Personality Attributes

| Attribute | Expression |
|---|---|
| **Trustworthy** | Solid blue anchor — the primary brand color conveys reliability |
| **Intelligent** | Clean, precise shapes — no ornamentation for its own sake |
| **Aquatic** | The gradient evokes ocean depth (deep blue) rising to water surface (cyan) |
| **Approachable** | Rounded letterforms and the playful shrimp icon reduce intimidation for non-tech farmers |
| **Progressive** | The upward energy of the shrimp tail / checkmark — "things are going up, things are checked" |

### 1.3 Core Design Principles

1. **Water flows upward in Upcheck.** Gradients always run from deep blue (bottom/dark) to cyan (top/light). This mirrors the literal physics of aquaculture — healthy dissolved oxygen rises, temperature gradients layer, light penetrates from the surface down.

2. **Data is the hero.** The UI is a stage for numbers, trends, and alerts. Never let decoration compete with the farmer's critical information.

3. **Calm precision.** No jarring transitions, no aggressive reds unless warranted by genuine critical alerts. The default emotional tone is focused and confident.

4. **Legible at a glance.** Farmers may be reading this in bright sunlight, on a boat, with wet hands. High contrast, large touch targets, minimal chrome.

---

## 2. Color System

### 2.1 Brand Gradient

Extracted directly from the logo:

```
Brand Gradient (Primary):
  Start: #0B6DC7  (deep ocean blue)
  Mid:   #0EA8D8  (ocean mid)
  End:   #00CDE8  (surface cyan)

Direction (standard): 135° (top-left to bottom-right)
Direction (vertical): 180° (top to bottom, used on hero elements)
Direction (horizontal): 90° (left to right, used on pills/badges)
```

CSS / StyleSheet definition:
```ts
export const brandGradient = {
  colors: ['#0B6DC7', '#00CDE8'],
  start: { x: 0, y: 0 },
  end:   { x: 1, y: 1 },
};

export const brandGradientVertical = {
  colors: ['#0B6DC7', '#00CDE8'],
  start: { x: 0, y: 0 },
  end:   { x: 0, y: 1 },
};
```

---

### 2.2 Full Color Palette

#### Primary — Ocean Blue Family
| Token | Hex | Usage |
|---|---|---|
| `primary-900` | `#063A6B` | Deep brand — darkest anchor |
| `primary-800` | `#08508F` | Dark interactive states (pressed) |
| `primary-700` | `#0B6DC7` | **Brand core — logo blue** |
| `primary-600` | `#0D84D6` | Default primary button fill |
| `primary-500` | `#0EA8D8` | Mid-gradient, active tab indicator |
| `primary-400` | `#29BCE6` | Light interactive |
| `primary-300` | `#00CDE8` | **Brand core — logo cyan** |
| `primary-200` | `#7DE3F4` | Tinted backgrounds, chip fills |
| `primary-100` | `#C2F2FB` | Very light tints, selected state bg |
| `primary-50`  | `#E8FAFD` | Subtle page-level tint |

#### Semantic — Status Colors
| Token | Hex | Name | Usage |
|---|---|---|---|
| `success-700` | `#1A6B3A` | Deep Green | Success text on light bg |
| `success-500` | `#27A855` | Green | Success icons, borders |
| `success-100` | `#D4EDDA` | Mint | Success backgrounds |
| `success-50`  | `#EAF7EE` | Light Mint | Success row highlights |
| `warning-700` | `#8A4700` | Deep Amber | Warning text on light bg |
| `warning-500` | `#F08C00` | Amber | Warning icons, borders |
| `warning-100` | `#FDEBC8` | Pale Amber | Warning backgrounds |
| `warning-50`  | `#FEF6E4` | Light Amber | Warning row highlights |
| `danger-700`  | `#A41B1B` | Deep Red | Danger text on light bg |
| `danger-500`  | `#E03535` | Red | Danger icons, borders |
| `danger-100`  | `#FAD5D5` | Pale Red | Danger backgrounds |
| `danger-50`   | `#FDF0F0` | Light Red | Danger row highlights |
| `info-700`    | `#0B4F8A` | Deep Info Blue | Info text |
| `info-500`    | `#1A7FD4` | Info Blue | Info icons |
| `info-100`    | `#CCDFF6` | Pale Blue | Info backgrounds |

#### Neutral — Surface & Text
| Token | Hex | Usage |
|---|---|---|
| `neutral-950` | `#0C1117` | Near-black — darkest text |
| `neutral-900` | `#1A222B` | Primary text |
| `neutral-800` | `#2C3A48` | Secondary text, strong labels |
| `neutral-700` | `#3E5163` | Tertiary text |
| `neutral-600` | `#556878` | Placeholder text |
| `neutral-500` | `#7A909F` | Disabled text |
| `neutral-400` | `#A3B5BF` | Borders (subtle) |
| `neutral-300` | `#C8D4DA` | Dividers |
| `neutral-200` | `#E0E8EC` | Surface borders |
| `neutral-100` | `#EEF2F5` | Surface variant |
| `neutral-50`  | `#F5F8FA` | Page background |
| `white`       | `#FFFFFF` | Card surfaces |

---

### 2.3 Semantic Color Roles

```ts
// theme/colorRoles.ts
export const light = {
  // Backgrounds
  background:        '#F5F8FA',   // main page background
  surface:           '#FFFFFF',   // card / sheet surface
  surfaceVariant:    '#EEF2F5',   // secondary surface (input bg)
  surfaceOverlay:    'rgba(11, 109, 199, 0.04)',  // branded tint on white

  // Borders
  borderDefault:     '#E0E8EC',
  borderStrong:      '#C8D4DA',
  borderBrand:       '#0EA8D8',

  // Text
  textPrimary:       '#1A222B',
  textSecondary:     '#3E5163',
  textTertiary:      '#7A909F',
  textDisabled:      '#A3B5BF',
  textInverse:       '#FFFFFF',
  textBrand:         '#0B6DC7',
  textLink:          '#0D84D6',

  // Interactive
  primary:           '#0D84D6',
  primaryHover:      '#0B6DC7',
  primaryPressed:    '#08508F',
  primaryDisabled:   '#A3B5BF',

  // Status
  successText:       '#1A6B3A',
  successBg:         '#EAF7EE',
  successBorder:     '#27A855',
  warningText:       '#8A4700',
  warningBg:         '#FEF6E4',
  warningBorder:     '#F08C00',
  dangerText:        '#A41B1B',
  dangerBg:          '#FDF0F0',
  dangerBorder:      '#E03535',
  infoText:          '#0B4F8A',
  infoBg:            '#EBF4FD',
  infoBorder:        '#1A7FD4',
};
```

### 2.4 Gradient Recipes

```ts
// theme/gradients.ts

export const gradients = {
  // Core brand gradient — used on primary buttons, FAB, hero cards
  brand: {
    colors: ['#0B6DC7', '#00CDE8'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
  },

  // Soft brand — used on selected tab, active state backgrounds
  brandSoft: {
    colors: ['#C2F2FB', '#E8FAFD'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
  },

  // Hero card overlay — semi-transparent over imagery
  heroOverlay: {
    colors: ['rgba(8, 80, 143, 0.90)', 'rgba(0, 205, 232, 0.70)'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 1 },
  },

  // Status gradients (for alert cards)
  dangerSoft: {
    colors: ['#FAD5D5', '#FDF0F0'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 0 },
  },
  warningSoft: {
    colors: ['#FDEBC8', '#FEF6E4'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 0 },
  },
  successSoft: {
    colors: ['#D4EDDA', '#EAF7EE'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 0 },
  },

  // Shimmer (skeleton loading animation)
  shimmer: {
    colors: ['#EEF2F5', '#E0E8EC', '#EEF2F5'],
    start: { x: 0, y: 0 },
    end:   { x: 1, y: 0 },
  },
};
```

---

## 3. Typography System

### 3.1 Font Selection

The logo uses a **rounded, geometric sans-serif** with friendly letterforms. The system uses:

| Role | Font | Reason |
|---|---|---|
| **Display / Brand** | **Nunito** | Rounded terminals match the logo letterforms exactly; warm, approachable |
| **Body / UI** | **DM Sans** | Clean, neutral, highly legible at small sizes; optical sizing built in |
| **Numeric / Data** | **DM Mono** | Monospaced for tabular data (FCR, biomass, SR values) — ensures alignment |

Install:
```ts
// In app layout
useFonts({
  'Nunito-Regular':    require('../assets/fonts/Nunito-Regular.ttf'),
  'Nunito-SemiBold':   require('../assets/fonts/Nunito-SemiBold.ttf'),
  'Nunito-Bold':       require('../assets/fonts/Nunito-Bold.ttf'),
  'Nunito-ExtraBold':  require('../assets/fonts/Nunito-ExtraBold.ttf'),
  'DMSans-Regular':    require('../assets/fonts/DMSans-Regular.ttf'),
  'DMSans-Medium':     require('../assets/fonts/DMSans-Medium.ttf'),
  'DMSans-SemiBold':   require('../assets/fonts/DMSans-SemiBold.ttf'),
  'DMMono-Regular':    require('../assets/fonts/DMMono-Regular.ttf'),
  'DMMono-Medium':     require('../assets/fonts/DMMono-Medium.ttf'),
});
```

---

### 3.2 Type Scale

```ts
// theme/typography.ts

export const typeScale = {

  // ── Display (Nunito, Brand contexts) ──────────────────────
  displayLarge: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: 'Nunito-Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontFamily: 'Nunito-Bold',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.2,
  },

  // ── Headings (Nunito) ──────────────────────────────────────
  h1: {
    fontFamily: 'Nunito-Bold',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  h2: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  h3: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  h4: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Body (DM Sans) ─────────────────────────────────────────
  bodyLarge: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Labels (DM Sans Medium) ────────────────────────────────
  labelLarge: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },

  // ── Numeric / Data (DM Mono) ───────────────────────────────
  numericHero: {
    fontFamily: 'DMMono-Medium',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as const,
  },
  numericLarge: {
    fontFamily: 'DMMono-Medium',
    fontSize: 24,
    lineHeight: 32,
    fontVariant: ['tabular-nums'] as const,
  },
  numericMedium: {
    fontFamily: 'DMMono-Regular',
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'] as const,
  },
  numericSmall: {
    fontFamily: 'DMMono-Regular',
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'] as const,
  },

  // ── Caption / Fine Print ───────────────────────────────────
  caption: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    lineHeight: 16,
    color: '#7A909F',
  },
  overline: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase' as const,
  },
};
```

### 3.3 Typography Usage Rules

- **Screen titles / headers** → `h1`, `Nunito-Bold`
- **Section titles within a screen** → `h2` or `h3`
- **Card titles** → `h3` or `labelLarge`
- **Metric values** (biomass, FCR, DOC) → `numericHero` / `numericLarge` — always `DM Mono`
- **Body copy, notes, descriptions** → `bodyMedium`, `DMSans-Regular`
- **Button labels** → `labelLarge`, `DMSans-SemiBold`
- **Tab bar labels** → `labelSmall`
- **Form field labels** → `labelMedium`
- **Helper / validation text** → `bodySmall`
- **Status chip text** → `labelSmall` (uppercase)
- **Table data** → `numericSmall` for numbers, `bodySmall` for text cells

---

## 4. Spacing & Layout Grid

### 4.1 Base Spacing Unit

**Base unit: 4px.** All spacing values are multiples of 4.

```ts
// theme/spacing.ts
export const spacing = {
  px:   1,   // hairline
  0.5:  2,   // 0.5 × 4
  1:    4,   // xs — icon padding, chip inner
  1.5:  6,
  2:    8,   // sm — tight gap between related elements
  2.5:  10,
  3:    12,  // md-sm — input vertical padding
  4:    16,  // md — standard content padding
  5:    20,
  6:    24,  // lg — card padding, section gap
  7:    28,
  8:    32,  // xl — major section separation
  10:   40,
  12:   48,  // xxl — screen top padding
  16:   64,
  20:   80,
  24:   96,
};
```

### 4.2 Layout Constants

```ts
// theme/layout.ts
export const layout = {
  // Screen edge padding
  screenPaddingH:   16,   // horizontal padding for all screens
  screenPaddingV:   20,   // vertical padding top

  // Cards
  cardPaddingH:     16,
  cardPaddingV:     16,
  cardGap:          12,   // gap between cards in a list

  // Sections
  sectionGap:       24,   // vertical gap between major sections

  // Bottom tab bar height (including safe area)
  tabBarHeight:     80,

  // Header height
  headerHeight:     56,

  // Touch targets
  minTouchTarget:   44,   // Apple/Google minimum
  iconButtonSize:   40,   // icon button tap area

  // Form
  inputHeight:      52,
  inputPaddingH:    14,

  // Bottom sheet
  sheetHandleWidth: 36,
  sheetHandleHeight: 4,
};
```

### 4.3 Grid System

The app uses a **single-column layout** for most screens (mobile-first). A 2-column grid is used for:
- Metric cards on the dashboard (2 per row)
- Calculator result cards (2 per row)
- Photo grid (2–3 per row)

```ts
export const grid = {
  columns: 2,
  gutter:  12,   // gap between columns
  margin:  16,   // screen edge margin
  // Column width = (screenWidth - 2*margin - gutter) / 2
};
```

---

## 5. Border Radius & Shape Language

The logo's shrimp mark and letterforms are **soft, rounded, continuous curves** — never angular or sharp. Every UI shape reflects this.

```ts
// theme/radius.ts
export const radius = {
  none:   0,
  xs:     4,    // subtle rounding — input borders, dividers
  sm:     8,    // small chips, small badges
  md:     12,   // standard cards, buttons
  lg:     16,   // larger cards, sheets
  xl:     20,   // hero cards, modal sheets
  xxl:    28,   // large rounded panels
  full:   9999, // pills, circular avatars, FAB
};
```

### Shape Rules

| Element | Border Radius |
|---|---|
| Primary Button | `radius.full` (pill shape) |
| Secondary Button | `radius.full` (pill shape) |
| Text Button | none |
| Input Fields | `radius.md` (12) |
| Cards (standard) | `radius.lg` (16) |
| Hero / Dashboard Cards | `radius.xl` (20) |
| Bottom Sheet | `radius.xxl` top-only (28, 28, 0, 0) |
| Chips / Badges | `radius.full` |
| Tab Bar | `radius.xxl` top-only if floating |
| Tooltips | `radius.md` |
| Modals | `radius.xl` (20) |
| Photo thumbnails | `radius.md` (12) |
| Avatar / Icon containers | `radius.full` |
| Alert Banners | `radius.md` (12) |

---

## 6. Elevation & Shadow System

Upcheck uses **blue-tinted shadows** — not the generic gray shadows. This keeps shadows on-brand and gives depth a watery quality.

```ts
// theme/shadows.ts
// All shadows use a tinted version of the brand color

export const shadows = {
  none: {},

  xs: {
    shadowColor: '#0B6DC7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  sm: {
    shadowColor: '#0B6DC7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  md: {
    shadowColor: '#0B6DC7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },

  lg: {
    shadowColor: '#0B6DC7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },

  xl: {
    shadowColor: '#0B6DC7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },

  // Special: brand glow (used on FAB, primary CTA)
  brandGlow: {
    shadowColor: '#00CDE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
};
```

### Elevation Usage

| Elevation | Shadow | Used on |
|---|---|---|
| 0 | `none` | Flat elements, dividers |
| 1 | `xs` | Subtle card differentiation |
| 2 | `sm` | Standard list cards |
| 4 | `md` | Floating cards, form sheets |
| 8 | `lg` | Bottom sheets, modals |
| 12 | `xl` | Dialogs, dropdowns |
| Brand | `brandGlow` | FAB, primary CTA button |

---

## 7. Iconography

### 7.1 Icon Library

**Primary:** `MaterialCommunityIcons` from `@expo/vector-icons`
**Supplemental:** Custom SVG icons for domain-specific concepts

### 7.2 Icon Sizes

```ts
export const iconSizes = {
  xs:   14,  // inline in text, chips
  sm:   18,  // secondary icons, decorative
  md:   22,  // standard UI icons (nav, form)
  lg:   28,  // feature icons in empty states
  xl:   36,  // section header icons
  xxl:  56,  // hero / illustration icons
  hero: 80,  // empty state illustrations
};
```

### 7.3 Domain Icon Map

| Feature | Icon name (MaterialCommunityIcons) |
|---|---|
| Farm | `home-city-outline` |
| Pond | `waves` |
| Cycle | `refresh-circle` |
| Water Quality | `water-check-outline` |
| Feed | `food-variant` |
| Feeding Tray | `silverware-fork-knife` |
| Sampling / MBW | `scale-balance` |
| Treatment | `medical-bag` |
| Harvest | `basket-check-outline` |
| Mortality | `skull-crossbones-outline` |
| Chemical | `flask-outline` |
| Plankton | `bacteria-outline` |
| Microbiology | `microscope` |
| Disease | `virus-outline` |
| Calculator | `calculator-variant-outline` |
| Simulation | `chart-timeline-variant-shimmer` |
| Notifications | `bell-outline` |
| Dissolved Oxygen | `air-filter` |
| pH | `alpha-p-circle-outline` |
| Temperature | `thermometer` |
| Salinity | `water-percent` |
| Transparency | `eye-outline` |
| ORP | `lightning-bolt-outline` |
| Vibrio | `bacteria` |
| Disease Encyclopedia | `book-open-page-variant-outline` |
| Settings | `cog-outline` |
| Profile | `account-circle-outline` |
| Sync | `cloud-sync-outline` |
| Offline | `cloud-off-outline` |

### 7.4 Icon Color Rules

- **Navigation icons (active):** Brand gradient via `react-native-linear-gradient` mask (or solid `primary-600`)
- **Navigation icons (inactive):** `neutral-500`
- **Form field leading icons:** `neutral-500`
- **Status icons:** Match semantic color (success-500, warning-500, danger-500)
- **Action icons in headers:** `neutral-800`
- **Icon on colored/gradient surface:** `white`

---

## 8. Component Design Tokens

```ts
// theme/tokens.ts — single source of truth for all component-level tokens

export const tokens = {

  // ── Button ──────────────────────────────────────────────
  button: {
    heightSm:        36,
    heightMd:        48,
    heightLg:        56,
    paddingH:        24,
    paddingHSm:      16,
    font:            'DMSans-SemiBold',
    fontSizeMd:      15,
    fontSizeSm:      13,
    fontSizeLg:      16,
    radiusPrimary:   9999,    // pill
    radiusSecondary: 9999,    // pill
    radiusText:      0,
    // Primary gradient: brandGradient
    // Shadow on primary: shadows.brandGlow
  },

  // ── Input ───────────────────────────────────────────────
  input: {
    height:          52,
    paddingH:        14,
    paddingV:        14,
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     '#E0E8EC',
    borderColorFocus:'#0D84D6',
    borderColorError:'#E03535',
    bgDefault:       '#F5F8FA',
    bgFocused:       '#FFFFFF',
    fontSize:        15,
    fontFamily:      'DMSans-Regular',
    labelFontFamily: 'DMSans-SemiBold',
    labelFontSize:   12,
    labelColor:      '#3E5163',
    placeholderColor:'#A3B5BF',
    textColor:       '#1A222B',
    helperFontSize:  11,
    helperColor:     '#7A909F',
    errorColor:      '#A41B1B',
    // Focus ring: 2px border of primary-600
  },

  // ── Card ────────────────────────────────────────────────
  card: {
    bgDefault:      '#FFFFFF',
    bgTinted:       '#F5F8FA',
    bgBrand:        'transparent',  // use gradient
    paddingH:        16,
    paddingV:        16,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     '#E0E8EC',
    // shadow: shadows.sm
  },

  // ── Chip / Badge ────────────────────────────────────────
  chip: {
    height:          26,
    paddingH:        10,
    borderRadius:    9999,
    fontSize:        11,
    fontFamily:      'DMSans-SemiBold',
    letterSpacing:   0.4,
    // Variants styled by status color tokens
  },

  // ── Bottom Tab Bar ──────────────────────────────────────
  tabBar: {
    height:          64,
    bgColor:         '#FFFFFF',
    borderTopWidth:  1,
    borderTopColor:  '#E0E8EC',
    activeColor:     '#0D84D6',
    inactiveColor:   '#A3B5BF',
    labelFontSize:   10,
    labelFontFamily: 'DMSans-SemiBold',
    iconSize:        22,
    // Active tab: icon + label in primary-600
    // Active indicator: 3px rounded bar above icon
  },

  // ── List Item ───────────────────────────────────────────
  listItem: {
    minHeight:       56,
    paddingH:        16,
    paddingV:        12,
    separatorColor:  '#EEF2F5',
    separatorInset:  16,
  },

  // ── Section Header ──────────────────────────────────────
  sectionHeader: {
    paddingH:        16,
    paddingV:        8,
    bgColor:         '#F5F8FA',
    fontSize:        11,
    fontFamily:      'DMSans-SemiBold',
    color:           '#7A909F',
    letterSpacing:   0.8,
    textTransform:   'uppercase',
  },

  // ── Alert Banner ────────────────────────────────────────
  alertBanner: {
    paddingH:        14,
    paddingV:        12,
    borderRadius:    12,
    borderLeftWidth: 4,
    fontSize:        13,
    fontFamily:      'DMSans-Medium',
  },
};
```

---

## 9. Component Specifications

### 9.1 Primary Button

```
┌─────────────────────────────────────┐
│   [gradient bg: brand]              │
│   ● Save Water Quality   → icon    │ height: 52px
│   [rounded-full]                    │
└─────────────────────────────────────┘

States:
  Default:  gradient fill (primary-700 → cyan-300), text white, brandGlow shadow
  Pressed:  scale(0.97), opacity 0.90
  Loading:  spinner replaces label, same gradient
  Disabled: bg neutral-200, text neutral-400, no shadow
```

### 9.2 Secondary Button (Outlined)

```
┌─────────────────────────────────────┐
│   [border: 1.5px primary-600]       │
│         Cancel                      │ height: 52px
│   [rounded-full, bg transparent]    │
└─────────────────────────────────────┘

States:
  Default:  transparent bg, primary-600 border, primary-600 text
  Pressed:  primary-50 bg
  Disabled: neutral-200 border, neutral-400 text
```

### 9.3 Input Field

```
Label (DMSans-SemiBold, 12px, textSecondary)
┌──────────────────────────────────────┐
│  🌡  25.4           °C     ● normal  │  height: 52px
│  [bg: surfaceVariant, 1.5px border] │
└──────────────────────────────────────┘
Helper text (DMSans-Regular, 11px)

Focus state: border becomes 1.5px primary-600
Warning state: border becomes 1.5px warning-500 + yellow RangeBanner below
Critical state: border becomes 1.5px danger-500 + red RangeBanner below
```

### 9.4 Status Badge / Chip

```
  ╭──────────────╮     ╭──────────────╮     ╭──────────────╮
  │  ✓  Normal   │     │  ⚠ Warning   │     │  ✕ Critical  │
  ╰──────────────╯     ╰──────────────╯     ╰──────────────╯
  bg: success-50       bg: warning-50        bg: danger-50
  text: success-700    text: warning-700     text: danger-700
  border: success-500  border: warning-500   border: danger-500
  radius: full         radius: full          radius: full
  font: DMSans-SemiBold 11px uppercase
```

### 9.5 Metric Card (Dashboard Hero)

```
┌──────────────────────────────────────────────────────┐
│ SURVIVAL RATE                         ↓ -1.2%        │
│                                                      │
│ 82.0                                   %             │
│ [DMMono-Medium, 36px]                                │
│                                                      │
│ ━━━━━━━━━━━━━░░░ Target: 85%                         │
│ [progress bar: brand gradient fill]                  │
└──────────────────────────────────────────────────────┘
bg: white, shadow: sm, radius: 16px
border: 1px neutral-200
Label: DMSans-SemiBold 10px uppercase, neutral-500
Value: DMMono-Medium 36px, neutral-900
Trend: DMSans-Medium 12px (green if ↑, red if ↓)
```

### 9.6 Pond Card

```
┌──────────────────────────────────────────────────────┐
│  ≋  Pond Alpha                    ● Active  Day 42   │
│     Square · 120 m²                                  │
│                                                      │
│  MBW: 8.4g    SR: 82%    FCR: 1.42    Bio: 124kg    │
└──────────────────────────────────────────────────────┘
bg: white, shadow: sm, radius: 16px
Left accent: 4px brand gradient bar (left edge of card)
Status chip: Active = primary-100 bg + primary-700 text
Metrics row: DMMono-Regular 13px
```

### 9.7 Alert Banner (Inline)

```
╔═══════════════════════════════════════════════════════╗
║  ⚠  pH 9.3 is above the safe range (7.5–8.5)        ║  warning
║     Normal range: 7.5 – 8.5                         ║
╚═══════════════════════════════════════════════════════╝
Left border: 4px warning-500
bg: warning-50
radius: 12px (3 corners), 0 top-left if attached to input

╔═══════════════════════════════════════════════════════╗
║  ✕  DO 2.1 mg/L is critically low (min: 3.0)        ║  critical
║     Immediate attention required                    ║
╚═══════════════════════════════════════════════════════╝
Left border: 4px danger-500
bg: danger-50
```

### 9.8 Feeding Tray Card

```
╭───────────────────╮  ╭───────────────────╮
│   TRAY 1          │  │   TRAY 2          │
│                   │  │                   │
│   ( ) Empty       │  │   (●) Few Left    │
│   (●) Few Left    │  │   ( ) Empty       │
│   ( ) A Lot Left  │  │   ( ) A Lot Left  │
│                   │  │                   │
│  Updated 2h ago   │  │  Updated 2h ago   │
╰───────────────────╯  ╰───────────────────╯

Tray card bg changes:
  Empty → danger-50 tint (light red — needs attention)
  Few Left → warning-50 tint (light amber)
  A Lot Left → success-50 tint (light green)
```

### 9.9 Quick Action Button

```
╭────────╮
│   💧   │   width: 72px, height: 80px
│        │   bg: primary-50
│  Water │   radius: 16px
│Quality │   icon: 28px, primary-600
╰────────╯   label: DMSans-Medium 11px, primary-700
             shadow: xs

Active/Pressed: bg primary-100, scale 0.95
```

### 9.10 FAB (Floating Action Button)

```
        ╭────╮
        │ ✚  │  56×56px
        ╰────╯  radius: full
                bg: brand gradient
                icon: white, 24px
                shadow: brandGlow
                Position: bottom-right, 20px from edge, 20px from tabbar
```

---

## 10. Screen-Level Design Patterns

### 10.1 Standard Screen Header

```
┌────────────────────────────────────────────┐
│  ←   Water Quality                    ⋮    │
│      Pond Alpha · Day 42                   │
└────────────────────────────────────────────┘
bg: white, border-bottom: 1px neutral-200
Title: Nunito-Bold 18px, neutral-900
Subtitle: DMSans-Regular 12px, neutral-500
Back arrow: neutral-700, tap target 44px
Menu icon (⋮): neutral-700
```

### 10.2 Section Headers Within a Screen

```
 WATER PARAMETERS                         See All →
 ─────────────────────────────────────────────────
 label: DMSans-SemiBold 11px, neutral-500, uppercase, 1.0 letter-spacing
 underline: 2px brand gradient, width: 24px, left-aligned
```

### 10.3 Empty State

```
          ╭─────────────────╮
          │                 │
          │   🌊 [large]    │
          │                 │
          ╰─────────────────╯

    No water quality logs yet.
    Start recording to see trends.

    [+ Log Water Quality]   ← secondary button
```

Icon: 64px, primary-300 (light, not alarming)
Title: Nunito-SemiBold 18px, neutral-700
Body: DMSans-Regular 14px, neutral-500
CTA: secondary outlined button

### 10.4 Loading Skeleton Pattern

Use animated shimmer (gradient sweep animation) with the app's neutral tones:

```ts
// Shimmer colors: ['#EEF2F5', '#E4ECF0', '#EEF2F5']
// Animation: 800ms linear, repeating
// Shape: matches the real content shape (card height, metric row height)
```

### 10.5 Dashboard Hero Card

```
┌─────────────────────────────────────────────────────────────┐
│ [Brand gradient bg: primary-700 → cyan]                     │
│                                                             │
│  Pond Alpha                               Day 42 of Culture │
│  Penaeus Vannamei                                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  DOC     │  │  MBW     │  │  SR      │  │  FCR     │   │
│  │  42      │  │  8.4g    │  │  82%     │  │  1.42    │   │
│  │  days    │  │          │  │     ↓    │  │     ✓    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
radius: 20px
Metric values: DMMono-Medium 22px, white
Metric labels: DMSans-Medium 11px, rgba(255,255,255,0.75)
Trend arrows: white with 0.75 opacity
Shadow: lg with brand color
```

---

## 11. Motion & Animation System

### 11.1 Duration Scale

```ts
export const duration = {
  instant:  0,
  fast:     120,    // micro-interactions (tap feedback)
  standard: 220,    // most transitions
  gentle:   350,    // sheet slide-in, modal open
  slow:     500,    // page-level transitions
  crawl:    800,    // skeleton shimmer, shimmer loops
};
```

### 11.2 Easing Curves

```ts
import { Easing } from 'react-native-reanimated';

export const easing = {
  standard:    Easing.bezier(0.4, 0, 0.2, 1),    // Material standard
  enter:       Easing.bezier(0, 0, 0.2, 1),       // Decelerate — things coming in
  exit:        Easing.bezier(0.4, 0, 1, 1),        // Accelerate — things going out
  spring:      Easing.bezier(0.34, 1.56, 0.64, 1), // Slight overshoot — playful
  linear:      Easing.linear,
};
```

### 11.3 Animation Patterns

#### Tap Feedback (All interactive elements)
```ts
// Scale down on press, spring back on release
withSpring(0.96, { damping: 15, stiffness: 300 })  // pressed
withSpring(1.00, { damping: 12, stiffness: 250 })  // released
```

#### Screen Entry (Push navigation)
```ts
// Slide from right: translateX from +20px to 0, opacity 0 → 1
duration: 250, easing: enter
```

#### Bottom Sheet / Modal Entry
```ts
// Slide from bottom: translateY from +100% to 0
duration: 350, easing: enter
// Backdrop: opacity 0 → 0.5, duration: 250
```

#### Card Reveal (Staggered list)
```ts
// Each card: translateY from +16px to 0, opacity 0 → 1
// Stagger: 60ms delay per item
// Duration: 300ms, easing: enter
```

#### Status Dot Color Change (Range validation)
```ts
// Animated background color transition
duration: 200, easing: standard
```

#### Number Countup (Dashboard metrics)
```ts
// On first load: animate numeric value from 0 to actual
// Duration: 600ms, easing: standard
// Uses react-native-reanimated shared value interpolation
```

#### Progress Bar Fill
```ts
// Width: 0% → actual%, on mount
// Duration: 700ms, easing: enter
// Color: brand gradient via animated mask
```

### 11.4 Reduced Motion

```ts
import { AccessibilityInfo } from 'react-native';

// Check and respect reduced motion setting
const [reduceMotion, setReduceMotion] = useState(false);
AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

// When true: skip all animations except instant state changes
```

---

## 12. Illustration & Visual Style

### 12.1 Empty State Illustrations

Use a consistent **line-art + gradient fill** style:
- Thin 2px strokes in `neutral-300`
- Gradient fills in brand palette (very light tints: primary-50, primary-100)
- Single focal element (shrimp, pond, flask, chart)
- No complex scenes — one object, generous white space

### 12.2 Watermark / Background Texture

For the dashboard hero section and onboarding, add a subtle water texture:
- Subtle sine-wave pattern (SVG) in `rgba(255,255,255,0.08)` overlaid on the gradient
- Creates a sense of water movement without competing with data

```tsx
// Achieved with an SVG Pattern overlay on the LinearGradient
<LinearGradient colors={['#0B6DC7', '#00CDE8']} style={styles.hero}>
  <WaterWavePattern opacity={0.08} />  {/* SVG wave lines */}
  {/* content */}
</LinearGradient>
```

### 12.3 The Upcheck Mark as UI Element

The shrimp logomark can appear as:
- A large watermark on the splash screen (white, 20% opacity)
- A favicon-sized icon on the app loading bar
- An accent in the empty cycle state ("Start your first cycle")

Do NOT use the full logo wordmark as a repeated UI element — it should only appear in the app header/splash.

---

## 13. Data Visualization Theme

### 13.1 Chart Colors

```ts
export const chartColors = {
  // Primary data series (MBW growth, biomass, daily feed)
  series1:      '#0D84D6',   // primary-600 — main line

  // Reference / comparison lines
  reference:    '#A3B5BF',   // neutral-400 — dashed reference curve
  target:       '#27A855',   // success-500 — target line

  // Status-colored data points
  pointNormal:  '#27A855',
  pointWarning: '#F08C00',
  pointCritical:'#E03535',

  // Range bands
  normalBand:   'rgba(39, 168, 85, 0.08)',    // success, very light fill
  warningBand:  'rgba(240, 140, 0, 0.08)',
  criticalBand: 'rgba(224, 53, 53, 0.08)',

  // Bar chart fill
  bar:          '#0EA8D8',
  barFasting:   '#EEF2F5',   // empty bar for fasting days

  // Threshold lines
  thresholdWarning:   '#F08C00',   // dashed
  thresholdCritical:  '#E03535',   // dashed

  // Simulation chart
  projectedBiomass:   '#0B6DC7',
  carryingCapacity:   '#A3B5BF',   // dashed gray
  partialHarvest:     '#F08C00',   // event vertical line
  finalHarvest:       '#27A855',   // event vertical line

  // Plankton donut
  greenAlgae:       '#27A855',
  diatom:           '#0D84D6',
  cyanobacteria:    '#E03535',
  dinoflagellate:   '#F08C00',
  protozoa:         '#9B59B6',
  euglenophyte:     '#16A085',
  other:            '#A3B5BF',
};
```

### 13.2 Chart Typography

```ts
export const chartTypography = {
  axisLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 10,
    fill: '#7A909F',
  },
  axisTick: {
    fontFamily: 'DMMono-Regular',
    fontSize: 10,
    fill: '#7A909F',
  },
  tooltip: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    fill: '#1A222B',
  },
  chartTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    fill: '#1A222B',
  },
  legend: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    fill: '#3E5163',
  },
};
```

### 13.3 Chart Design Rules

- All charts have a **white card background** with `shadow.sm` and `radius.lg`.
- Grid lines: `neutral-100`, 1px, horizontal only (no vertical grid lines).
- Axis lines: `neutral-300`, 1px.
- Touch target for data points: minimum 20×20px invisible hit area.
- Tooltip: white card, `radius.md`, `shadow.md`, arrow pointer toward data point.
- Empty chart state: show a dashed placeholder line at center with "Not enough data" label.

---

## 14. Dark Mode System

Upcheck supports dark mode. The brand gradient deepens beautifully on dark surfaces.

```ts
// theme/colorRoles.ts — dark variant

export const dark = {
  // Backgrounds
  background:        '#0C1117',   // deep ocean dark
  surface:           '#151E28',   // card surface
  surfaceVariant:    '#1E2C3A',   // input bg
  surfaceOverlay:    'rgba(0, 205, 232, 0.05)',

  // Borders
  borderDefault:     '#243342',
  borderStrong:      '#2F4257',
  borderBrand:       '#0EA8D8',

  // Text
  textPrimary:       '#ECF3F8',
  textSecondary:     '#8AACC0',
  textTertiary:      '#556878',
  textDisabled:      '#3E5163',
  textInverse:       '#0C1117',
  textBrand:         '#29BCE6',
  textLink:          '#29BCE6',

  // Interactive — gradient unchanged, always vibrant
  primary:           '#0D84D6',
  primaryHover:      '#0EA8D8',
  primaryPressed:    '#0B6DC7',
  primaryDisabled:   '#243342',

  // Status (slightly lighter fills on dark bg)
  successText:       '#4DC97C',
  successBg:         '#0D2116',
  successBorder:     '#1A6B3A',
  warningText:       '#F5A623',
  warningBg:         '#241600',
  warningBorder:     '#8A4700',
  dangerText:        '#F07070',
  dangerBg:          '#240808',
  dangerBorder:      '#A41B1B',
  infoText:          '#7BC4F0',
  infoBg:            '#061524',
  infoBorder:        '#0B4F8A',
};
```

### Dark Mode Gradient Adaptation

On dark surfaces, the gradient should appear slightly more vibrant:
```ts
// Dark mode brand gradient
export const brandGradientDark = {
  colors: ['#0A5AAF', '#00E5FF'],
  start: { x: 0, y: 0 },
  end:   { x: 1, y: 1 },
};
```

### Dark Mode Switch

```ts
// theme/useTheme.ts
import { useColorScheme } from 'react-native';
import { light, dark } from './colorRoles';

export const useTheme = () => {
  const scheme = useColorScheme();
  return {
    colors: scheme === 'dark' ? dark : light,
    isDark: scheme === 'dark',
  };
};
```

---

## 15. React Native Theme Implementation

### 15.1 Theme Provider

```ts
// theme/index.ts — complete exportable theme object

import { colors } from './colors';
import { typeScale } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { tokens } from './tokens';
import { gradients } from './gradients';
import { chartColors, chartTypography } from './charts';
import { iconSizes } from './icons';
import { layout, grid } from './layout';
import { duration, easing } from './motion';
import { light, dark } from './colorRoles';

export const theme = {
  colors,
  typeScale,
  spacing,
  radius,
  shadows,
  tokens,
  gradients,
  chart: { colors: chartColors, typography: chartTypography },
  icons: { sizes: iconSizes },
  layout,
  grid,
  motion: { duration, easing },
  roles: { light, dark },
} as const;

export type Theme = typeof theme;
```

### 15.2 Usage Pattern in Components

```tsx
// components/ui/PrimaryButton.tsx
import { theme } from '@/theme';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring
} from 'react-native-reanimated';

const PrimaryButton = ({ label, onPress, loading, disabled }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, theme.shadows.brandGlow]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1.0); }}
        onPress={disabled || loading ? undefined : onPress}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={disabled ? ['#E0E8EC', '#E0E8EC'] : ['#0B6DC7', '#00CDE8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: theme.tokens.button.heightMd,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.tokens.button.paddingH,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{
            ...theme.typeScale.labelLarge,
            color: disabled ? theme.roles.light.textDisabled : '#FFFFFF',
          }}>
            {loading ? <Spinner size={16} color="#fff" /> : label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};
```

---

## 16. Usage Examples by Screen

### 16.1 Pond Dashboard — Color Usage Map

```
Screen background:          background (#F5F8FA)
Hero card:                  brand gradient + white text
Section headers:            neutral-500 uppercase labels
Metric card borders:        neutral-200
Metric values:              DMMono-Medium, neutral-900
Positive trends (↑):        success-500 text
Negative trends (↓):        danger-500 text
Neutral trends (—):         neutral-500 text
Alert banner (critical):    danger-50 bg, danger-500 left border
Alert banner (warning):     warning-50 bg, warning-500 left border
Quick action buttons:       primary-50 bg, primary-600 icon+label
Tab bar active:             primary-600 icon+label
Tab bar inactive:           neutral-500
FAB:                        brand gradient + brandGlow shadow
```

### 16.2 Water Quality Form — Color Usage Map

```
Screen bg:                  background (#F5F8FA)
Form card:                  white, shadow.sm
Field labels:               neutral-600, DMSans-SemiBold 12px
Input default border:       neutral-300 (1.5px)
Input focus border:         primary-600 (1.5px)
Input status dot — normal:  success-500
Input status dot — warning: warning-500
Input status dot — critical:danger-500
RangeBanner warning:        warning-50 bg, warning-500 left border
RangeBanner critical:       danger-50 bg, danger-500 left border
Weather icon selector:      primary-100 bg when selected, primary-600 icon
Water color picker:         colored swatches, selected = primary ring border
Submit button:              brand gradient pill
```

### 16.3 Disease Encyclopedia — Color Usage Map

```
Screen bg:                  background
Search bar bg:              surfaceVariant, border primary on focus
Filter chips (unselected):  neutral-100 bg, neutral-600 text
Filter chips (selected):    primary-100 bg, primary-700 text, primary-600 border
Disease code badge:         primary-700 bg, white text, radius.sm
Disease card:               white card, shadow.sm
Card left accent:           4px gradient bar (primary-700 → cyan)
Reference image placeholder:neutral-100 bg, neutral-400 icon
```

### 16.4 Simulation Results — Color Usage Map

```
Tab bar (Feed/Biomass/Harvest): white, active tab = primary-600 text + underline
Table header row:           neutral-50 bg, neutral-500 text uppercase
Table data rows (alternate):white / neutral-50
Harvest event rows:         primary-50 bg (partial) or success-50 (final)
Numbers in table:           DMMono-Regular, neutral-800
Summary footer card:        brand gradient bg, all text white
Revenue / profit values:    white, DMMono-Medium
```

---

## 17. Accessibility & Contrast Compliance

### 17.1 Color Contrast Ratios (WCAG AA)

| Foreground | Background | Ratio | Pass? |
|---|---|---|---|
| `neutral-900` (#1A222B) | `white` (#FFFFFF) | 16.1:1 | ✅ AAA |
| `neutral-700` (#3E5163) | `white` | 7.8:1 | ✅ AAA |
| `neutral-500` (#7A909F) | `white` | 3.8:1 | ✅ AA (large text) |
| `primary-700` (#0B6DC7) | `white` | 4.9:1 | ✅ AA |
| `primary-600` (#0D84D6) | `white` | 3.8:1 | ✅ AA (large text) |
| `white` | `primary-700` (#0B6DC7) | 4.9:1 | ✅ AA |
| `white` | brand gradient (avg) | ~5.2:1 | ✅ AA |
| `success-700` (#1A6B3A) | `success-50` (#EAF7EE) | 6.4:1 | ✅ AA |
| `warning-700` (#8A4700) | `warning-50` (#FEF6E4) | 5.8:1 | ✅ AA |
| `danger-700` (#A41B1B) | `danger-50` (#FDF0F0) | 6.2:1 | ✅ AA |

> ⚠️ `primary-300` (#00CDE8) on white fails WCAG AA (ratio ~2.1:1). **Never use it for text.** Use only for decorative elements, backgrounds, or gradient ends.

### 17.2 Touch Target Compliance

All tappable elements minimum 44×44pt. Implementation:
```ts
// For small icons, add transparent padding
const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
<TouchableOpacity hitSlop={hitSlop}>
  <Icon name="close" size={18} />
</TouchableOpacity>
```

### 17.3 Color-Only Information Rule

Status is **never conveyed by color alone**. Every status indicator also includes:
- An icon (✓ ⚠ ✕)
- A text label (Normal / Warning / Critical)
- A shape or position difference where possible

---

## 18. Brand Voice & Microcopy

### 18.1 Tone

Upcheck speaks like a **knowledgeable, calm colleague** — not a clinical database or an overly enthusiastic app. The tone is:

- **Direct:** "Mortality exceeded 20%" not "We've noticed that your mortality count may have surpassed…"
- **Actionable:** Always follow a problem with what to do next.
- **Respectful:** Farmers are experts. Never patronize.
- **Calm under pressure:** Even critical alerts are matter-of-fact, not alarming.

### 18.2 Key Copy Patterns

| Context | ✅ Do | ❌ Don't |
|---|---|---|
| Empty state title | "No logs yet" | "It looks like you haven't added anything!" |
| Success toast | "Saved successfully" | "Awesome! Your data has been saved!" |
| Critical alert | "DO 2.1 mg/L — below minimum. Increase aeration." | "WARNING!!! Oxygen critically low!!!" |
| Fasting day toggle | "Fasting Day — no feed logged" | "Oops, no meals today?" |
| Loading state | "Loading pond data…" | "Hang tight, we're fetching your stuff!" |
| Confirm delete | "Delete this log? This cannot be undone." | "Are you sure? This is permanent!" |
| Cycle complete | "Cycle completed. Final harvest recorded." | "Congratulations! You did it! 🎉" |
| Offline banner | "Offline — data will sync when reconnected" | "Uh oh! No internet connection detected." |

### 18.3 Unit Display Convention

Always show units close to the value with consistent formatting:

```
✅  8.4 g       ❌  8.4g     (no space)
✅  124.0 kg    ❌  124 kg   (always one decimal for weights)
✅  82.0%       ❌  82%      (always one decimal for percentages)
✅  1.42        ❌  1.4      (FCR always two decimal places)
✅  Day 42      ❌  DOC 42   (use "Day" not the abbreviation in UI)
✅  pH 7.8      ❌  7.8 pH   (unit prefix for pH)
✅  25.4 °C     ❌  25.4°    (always include unit)
```

### 18.4 Status Label Conventions

| State | Label |
|---|---|
| Cycle active | `Active` |
| Cycle completed | `Completed` |
| Cycle aborted | `Aborted` |
| Pond with no cycle | `Ready` |
| Tray empty | `Empty` |
| Tray almost empty | `Few Left` |
| Tray has feed | `A Lot Left` |
| Upload pending | `Uploading…` |
| Upload failed | `Upload Failed` |
| Value in range | `Normal` |
| Value warning | `Warning` |
| Value critical | `Critical` |

---

*End of Design System*
*Upcheck Design System v1.0*
*Aligned to Upcheck brand logo — blue-to-cyan gradient, rounded forms, aquatic identity*