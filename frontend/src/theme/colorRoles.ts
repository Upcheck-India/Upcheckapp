// theme/colorRoles.ts
export const light = {
    // Backgrounds
    background: '#F5F8FA', // main page background
    surface: '#FFFFFF', // card / sheet surface
    surfaceVariant: '#EEF2F5', // secondary surface (input bg)
    surfaceOverlay: 'rgba(11, 109, 199, 0.04)', // branded tint on white

    // Borders
    borderDefault: '#E0E8EC',
    borderStrong: '#C8D4DA',
    borderBrand: '#0EA8D8',

    // Text
    textPrimary: '#1A222B',
    textSecondary: '#3E5163',
    textTertiary: '#7A909F',
    textDisabled: '#A3B5BF',
    textInverse: '#FFFFFF',
    textBrand: '#0B6DC7',
    textLink: '#0D84D6',

    // Interactive
    primary: '#0D84D6',
    primaryHover: '#0B6DC7',
    primaryPressed: '#08508F',
    primaryDisabled: '#A3B5BF',

    // Status
    successText: '#1A6B3A',
    successBg: '#EAF7EE',
    successBorder: '#27A855',
    warningText: '#8A4700',
    warningBg: '#FEF6E4',
    warningBorder: '#F08C00',
    dangerText: '#A41B1B',
    dangerBg: '#FDF0F0',
    dangerBorder: '#E03535',
    infoText: '#0B4F8A',
    infoBg: '#EBF4FD',
    infoBorder: '#1A7FD4',
};

// theme/colorRoles.ts — dark variant
export const dark = {
    // Backgrounds
    background: '#0C1117', // deep ocean dark
    surface: '#151E28', // card surface
    surfaceVariant: '#1E2C3A', // input bg
    surfaceOverlay: 'rgba(0, 205, 232, 0.05)',

    // Borders
    borderDefault: '#243342',
    borderStrong: '#2F4257',
    borderBrand: '#0EA8D8',

    // Text
    textPrimary: '#ECF3F8',
    textSecondary: '#8AACC0',
    textTertiary: '#556878',
    textDisabled: '#3E5163',
    textInverse: '#0C1117',
    textBrand: '#29BCE6',
    textLink: '#29BCE6',

    // Interactive — gradient unchanged, always vibrant
    primary: '#0D84D6',
    primaryHover: '#0EA8D8',
    primaryPressed: '#0B6DC7',
    primaryDisabled: '#243342',

    // Status (slightly lighter fills on dark bg)
    successText: '#4DC97C',
    successBg: '#0D2116',
    successBorder: '#1A6B3A',
    warningText: '#F5A623',
    warningBg: '#241600',
    warningBorder: '#8A4700',
    dangerText: '#F07070',
    dangerBg: '#240808',
    dangerBorder: '#A41B1B',
    infoText: '#7BC4F0',
    infoBg: '#061524',
    infoBorder: '#0B4F8A',
};
