export const WaterQualityRanges = {
    ph: { min: 7.5, max: 8.5 },
    do: { min: 4.0, max: null }, // Greater than 4
    temperature: { min: 28, max: 32 },
    salinity: { min: 15, max: 25 },
    ammonia: { min: null, max: 0.1 }, // Less than 0.1
    nitrite: { min: null, max: 1.0 }, // Less than 1.0
    alkalinity: { min: 100, max: 150 },
    transparency: { min: 30, max: 40 },
};

export type ParameterStatus = 'safe' | 'warning' | 'critical' | 'none';

export const getParameterStatus = (key: keyof typeof WaterQualityRanges, value?: number): ParameterStatus => {
    if (value === undefined || value === null || isNaN(value)) return 'none';

    const range = WaterQualityRanges[key];
    if (!range) return 'none';

    // Specific critical thresholds
    if (key === 'do' && value < 3.0) return 'critical';
    if (key === 'ammonia' && value > 0.5) return 'critical';
    if (key === 'ph' && (value < 6.5 || value > 9.5)) return 'critical';

    // Warning thresholds based on ideal range
    if (range.min !== null && value < range.min) return 'warning';
    if (range.max !== null && value > range.max) return 'warning';

    return 'safe';
};

/**
 * Compact, language-neutral "ideal range" hint for a parameter, e.g. "7.5–8.5",
 * "≥ 4", "≤ 0.1". Returned for known parameters only; null otherwise so the
 * input simply omits the hint.
 */
export const getParameterRangeHint = (key?: keyof typeof WaterQualityRanges): string | null => {
    if (!key) return null;
    const range = WaterQualityRanges[key];
    if (!range) return null;
    const { min, max } = range;
    if (min !== null && max !== null) return `${min}–${max}`;
    if (min !== null) return `≥ ${min}`;
    if (max !== null) return `≤ ${max}`;
    return null;
};

export const getStatusColor = (status: ParameterStatus) => {
    switch (status) {
        case 'safe': return '#4CAF50';
        case 'warning': return '#FFC107';
        case 'critical': return '#F44336';
        default: return '#E0E0E0';
    }
};

export const getStatusIcon = (status: ParameterStatus) => {
    switch (status) {
        case 'safe': return 'check-circle';
        case 'warning': return 'alert-circle';
        case 'critical': return 'alert-octagon';
        default: return 'help-circle-outline';
    }
};
