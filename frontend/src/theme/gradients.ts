export const gradients = {
    // Core brand gradient — used on primary buttons, FAB, hero cards
    brand: {
        colors: ['#0B6DC7', '#00CDE8'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },

    brandVertical: {
        colors: ['#0B6DC7', '#00CDE8'],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
    },

    // Soft brand — used on selected tab, active state backgrounds
    brandSoft: {
        colors: ['#C2F2FB', '#E8FAFD'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },

    // Hero card overlay — semi-transparent over imagery
    heroOverlay: {
        colors: ['rgba(8, 80, 143, 0.90)', 'rgba(0, 205, 232, 0.70)'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
    },

    // Status gradients (for alert cards)
    dangerSoft: {
        colors: ['#FAD5D5', '#FDF0F0'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
    },
    warningSoft: {
        colors: ['#FDEBC8', '#FEF6E4'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
    },
    successSoft: {
        colors: ['#D4EDDA', '#EAF7EE'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
    },

    // Shimmer (skeleton loading animation)
    shimmer: {
        colors: ['#EEF2F5', '#E0E8EC', '#EEF2F5'],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
    },
};
