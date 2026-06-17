/**
 * Bundled disease-diagnosis knowledge base (blueprint §16.1/§16.4).
 *
 * Works fully offline. Each disease has a weighted symptom profile — primary
 * signs weigh 3, secondary signs weigh 1 — used by the local matcher
 * (features/diseaseMatch.ts) to rank likely diseases from observed symptoms.
 * `libraryName` is used to deep-link to the server disease library entry when
 * online; matching itself never needs the network.
 *
 * This is decision-support, not a diagnosis — the UI must say "confirm with an
 * expert" (treatments are expert-gated).
 */
export type SymptomCategory = 'physical' | 'behavioral' | 'environmental';

export interface SymptomDef {
    id: string;
    category: SymptomCategory;
    /** i18n key; falls back to `label`. */
    labelKey: string;
    label: string;
}

export const SYMPTOMS: SymptomDef[] = [
    // Physical
    { id: 'white_spots', category: 'physical', labelKey: 'diagnose.sym_white_spots', label: 'White spots on shell' },
    { id: 'red_discoloration', category: 'physical', labelKey: 'diagnose.sym_red', label: 'Red discoloration' },
    { id: 'soft_shell', category: 'physical', labelKey: 'diagnose.sym_soft_shell', label: 'Soft / loose shell' },
    { id: 'black_gills', category: 'physical', labelKey: 'diagnose.sym_black_gills', label: 'Black / dark gills' },
    { id: 'white_feces', category: 'physical', labelKey: 'diagnose.sym_white_feces', label: 'White faecal strings' },
    { id: 'empty_gut', category: 'physical', labelKey: 'diagnose.sym_empty_gut', label: 'Empty gut' },
    { id: 'pale_hepatopancreas', category: 'physical', labelKey: 'diagnose.sym_pale_hp', label: 'Pale / shrunken hepatopancreas' },
    { id: 'white_muscle', category: 'physical', labelKey: 'diagnose.sym_white_muscle', label: 'White / opaque muscle' },
    { id: 'yellow_head', category: 'physical', labelKey: 'diagnose.sym_yellow_head', label: 'Yellow head / cephalothorax' },
    { id: 'size_variation', category: 'physical', labelKey: 'diagnose.sym_size_var', label: 'Uneven size / stunted growth' },
    // Behavioral
    { id: 'reduced_feeding', category: 'behavioral', labelKey: 'diagnose.sym_reduced_feeding', label: 'Reduced feeding' },
    { id: 'lethargy', category: 'behavioral', labelKey: 'diagnose.sym_lethargy', label: 'Lethargy' },
    { id: 'surfacing', category: 'behavioral', labelKey: 'diagnose.sym_surfacing', label: 'Swimming at surface / edges' },
    { id: 'erratic_swimming', category: 'behavioral', labelKey: 'diagnose.sym_erratic', label: 'Erratic swimming' },
    { id: 'cannibalism', category: 'behavioral', labelKey: 'diagnose.sym_cannibalism', label: 'Cannibalism' },
    // Environmental
    { id: 'low_do', category: 'environmental', labelKey: 'diagnose.sym_low_do', label: 'Low dissolved oxygen' },
    { id: 'high_ammonia', category: 'environmental', labelKey: 'diagnose.sym_high_ammonia', label: 'High ammonia' },
    { id: 'abnormal_water_color', category: 'environmental', labelKey: 'diagnose.sym_water_color', label: 'Abnormal water colour' },
];

export interface DiseaseProfile {
    key: string;
    name: string;
    /** Name to match against the server disease library for deep-linking. */
    libraryName: string;
    severity: 'low' | 'medium' | 'high';
    primary: string[];   // weight 3
    secondary: string[]; // weight 1
}

export const PRIMARY_WEIGHT = 3;
export const SECONDARY_WEIGHT = 1;

export const DISEASE_PROFILES: DiseaseProfile[] = [
    {
        key: 'wssv', name: 'White Spot Syndrome (WSSV)', libraryName: 'White Spot', severity: 'high',
        primary: ['white_spots', 'reduced_feeding', 'lethargy'],
        secondary: ['red_discoloration', 'surfacing', 'soft_shell'],
    },
    {
        key: 'ems', name: 'Early Mortality Syndrome (EMS/AHPND)', libraryName: 'Early Mortality', severity: 'high',
        primary: ['empty_gut', 'pale_hepatopancreas', 'reduced_feeding'],
        secondary: ['lethargy', 'soft_shell', 'surfacing'],
    },
    {
        key: 'ehp', name: 'Enterocytozoon hepatopenaei (EHP)', libraryName: 'EHP', severity: 'medium',
        primary: ['size_variation', 'reduced_feeding'],
        secondary: ['empty_gut', 'white_feces', 'pale_hepatopancreas'],
    },
    {
        key: 'wfs', name: 'White Feces Syndrome (WFS)', libraryName: 'White Feces', severity: 'medium',
        primary: ['white_feces', 'reduced_feeding'],
        secondary: ['soft_shell', 'empty_gut', 'lethargy'],
    },
    {
        key: 'vibriosis', name: 'Vibriosis', libraryName: 'Vibriosis', severity: 'medium',
        primary: ['red_discoloration', 'lethargy'],
        secondary: ['reduced_feeding', 'black_gills', 'surfacing'],
    },
    {
        key: 'black_gill', name: 'Black Gill Disease', libraryName: 'Black Gill', severity: 'medium',
        primary: ['black_gills'],
        secondary: ['lethargy', 'reduced_feeding', 'high_ammonia', 'abnormal_water_color'],
    },
    {
        key: 'white_muscle', name: 'White Muscle Disease', libraryName: 'White Muscle', severity: 'medium',
        primary: ['white_muscle'],
        secondary: ['lethargy', 'low_do'],
    },
    {
        key: 'yhd', name: 'Yellow Head Disease (YHD)', libraryName: 'Yellow Head', severity: 'high',
        primary: ['yellow_head', 'reduced_feeding'],
        secondary: ['lethargy', 'surfacing', 'red_discoloration'],
    },
];
