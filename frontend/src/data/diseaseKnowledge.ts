/**
 * ============================================================================
 * DRAFT — NOT REVIEWED. The disease profiles below must be reviewed by a named
 * aquaculture-health person before release (spec 2026-09-19 D8.2, same rule as
 * D1). Set PROFILES_REVIEWED_BY to that person's name when they sign off; the
 * `profiles.reviewed` test stays skipped until then.
 * ============================================================================
 *
 * Bundled disease-diagnosis knowledge base (blueprint §16.1/§16.4).
 *
 * Works fully offline. Each disease has a weighted symptom profile — primary
 * signs weigh 3, secondary signs weigh 1 — scored by features/diseaseMatch.ts.
 * This suggests what to check; it cannot diagnose. It never gives treatment
 * advice — the result screen sends the farmer to a lab (PCR) instead.
 *
 * Sources for the D8 additions (fetched 2026-09-19):
 *  [WOAH-WSSV] WOAH Aquatic Manual 2023, ch. 2.2.9 "Infection with white spot
 *      syndrome virus", §2.3.2 — lethargy, reduced/absent feeding, "abnormal
 *      swimming behaviour - slow swimming, swimming on side, swimming near
 *      water surface and gathering around edges"; white spots "not a reliable
 *      diagnostic sign" on their own.
 *      https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/current/2.2.09_WSSV.pdf
 *  [WOAH-IHHN] WOAH Aquatic Manual 2023, ch. 2.2.4 "Infection with IHHNV",
 *      §2.3.2–2.3.3 — runt-deformity syndrome: rostrum bent 45–90° left or
 *      right, deformed 6th abdominal segment, "disparate growth with a wide
 *      distribution of sizes" (CV > 30%); high mortality unusual.
 *      https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/current/2.2.04_IHHN.pdf
 *  [RMS] Alavandi S.V. et al. (ICAR-CIBA) 2019, "Investigation on the
 *      infectious nature of Running Mortality Syndrome (RMS) of farmed Pacific
 *      white leg shrimp, Penaeus vannamei in shrimp farms of India",
 *      Aquaculture 500: 278–289 — "patches of whitish musculature in the
 *      abdominal segments" with continuous low-level mortality after ~35–40 DOC.
 *      https://agris.fao.org/search/en/providers/122535/records/65df8e74b766d82b18026498
 *  [LSS] Alavandi S.V. et al. (ICAR-CIBA) 2008, "Loose shell syndrome of farmed
 *      Penaeus monodon in India is caused by a filterable agent", Dis Aquat Org
 *      (PMID 18924381) — "a flaccid spongy abdomen due to muscular dystrophy,
 *      space between the exoskeleton and muscle, and a shrunken
 *      hepatopancreas"; gradual, low-level progressive mortality.
 *      https://pubmed.ncbi.nlm.nih.gov/18924381/
 *  [DFO-VIB] Fisheries and Oceans Canada, "Vibrio spp. (Vibrio Disease) of
 *      Cultured Shrimp" — some strains "cause the shrimp to be luminescent";
 *      "anorexia and behavioural changes"; "opacity of musculature".
 *      https://www.dfo-mpo.gc.ca/science/aah-saa/diseases-maladies/vibriosp-eng.html
 *  [ZHANG-2020] Zhang X-H, He X, Austin B. 2020, "Vibrio harveyi: a serious
 *      pathogen of fish and invertebrates in mariculture", Mar Life Sci Technol
 *      (PMID 32419972) — luminous vibriosis: "affected animals glow in the dark".
 *
 * `cannibalism` was dropped: no source above ties it to a profile as a sign
 * (WOAH-IHHN mentions weak shrimp being cannibalised by healthy ones, which is
 * a transmission route, not a sign the farmer can use). The profiles that were
 * here before D8 (WSSV, EMS, EHP, WFS, Vibriosis, Black Gill, White Muscle,
 * YHD) are unchanged except WSSV gaining `erratic_swimming` [WOAH-WSSV]; they
 * were never sourced and need the same review.
 */
export type SymptomCategory = 'physical' | 'behavioral' | 'environmental';

/** Name of the aquaculture-health reviewer who signed off these profiles. */
export const PROFILES_REVIEWED_BY = '';

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
    { id: 'soft_shell', category: 'physical', labelKey: 'diagnose.sym_soft_shell', label: 'Soft shell' },
    { id: 'loose_shell', category: 'physical', labelKey: 'diagnose.sym_loose_shell', label: 'Loose shell (gap between shell and meat)' },
    { id: 'black_gills', category: 'physical', labelKey: 'diagnose.sym_black_gills', label: 'Black / dark gills' },
    { id: 'white_feces', category: 'physical', labelKey: 'diagnose.sym_white_feces', label: 'White faecal strings' },
    { id: 'empty_gut', category: 'physical', labelKey: 'diagnose.sym_empty_gut', label: 'Empty gut' },
    { id: 'pale_hepatopancreas', category: 'physical', labelKey: 'diagnose.sym_pale_hp', label: 'Pale / shrunken hepatopancreas' },
    { id: 'white_muscle', category: 'physical', labelKey: 'diagnose.sym_white_muscle', label: 'White / opaque muscle' },
    { id: 'yellow_head', category: 'physical', labelKey: 'diagnose.sym_yellow_head', label: 'Yellow head / cephalothorax' },
    { id: 'deformed_rostrum', category: 'physical', labelKey: 'diagnose.sym_deformed_rostrum', label: 'Bent / deformed rostrum' },
    { id: 'luminescence', category: 'physical', labelKey: 'diagnose.sym_luminescence', label: 'Shrimp glow in the dark' },
    { id: 'size_variation', category: 'physical', labelKey: 'diagnose.sym_size_var', label: 'Uneven size / stunted growth' },
    // Behavioral
    { id: 'reduced_feeding', category: 'behavioral', labelKey: 'diagnose.sym_reduced_feeding', label: 'Reduced feeding' },
    { id: 'lethargy', category: 'behavioral', labelKey: 'diagnose.sym_lethargy', label: 'Lethargy' },
    { id: 'surfacing', category: 'behavioral', labelKey: 'diagnose.sym_surfacing', label: 'Swimming at surface / edges' },
    { id: 'erratic_swimming', category: 'behavioral', labelKey: 'diagnose.sym_erratic', label: 'Erratic swimming' },
    { id: 'steady_deaths', category: 'behavioral', labelKey: 'diagnose.sym_steady_deaths', label: 'A few deaths every day' },
    // Environmental
    { id: 'low_do', category: 'environmental', labelKey: 'diagnose.sym_low_do', label: 'Low dissolved oxygen' },
    { id: 'high_ammonia', category: 'environmental', labelKey: 'diagnose.sym_high_ammonia', label: 'High ammonia' },
    { id: 'abnormal_water_color', category: 'environmental', labelKey: 'diagnose.sym_water_color', label: 'Abnormal water colour' },
];

/**
 * D6 health-observation sign → Diagnose symptom id, for the "from your logs"
 * prefill. Every HEALTH_SIGNS entry maps; the ids differ only for history.
 */
export const HEALTH_SIGN_TO_SYMPTOM: Record<string, string> = {
    soft_shell: 'soft_shell',
    white_feces: 'white_feces',
    red_body: 'red_discoloration',
    empty_gut: 'empty_gut',
    loose_shell: 'loose_shell',
    black_gill: 'black_gills',
    luminescence: 'luminescence',
    surface_gathering: 'surfacing',
    erratic_swimming: 'erratic_swimming',
    white_spots: 'white_spots',
    pale_hp: 'pale_hepatopancreas',
};

export interface DiseaseProfile {
    /** Stable key: the i18n name (`diagnose.disease_<key>`) and the deep-link key. */
    key: string;
    /** English fallback name. */
    name: string;
    /**
     * The server library row's seeded `scientific_name` (never translated,
     * backend DISEASE_SEED_DATA) — matched EXACTLY, never as a substring.
     * Undefined = the library has no entry for this disease.
     */
    libraryScientificName?: string;
    severity: 'low' | 'medium' | 'high';
    primary: string[];   // weight 3
    secondary: string[]; // weight 1
}

export const PRIMARY_WEIGHT = 3;
export const SECONDARY_WEIGHT = 1;

export const DISEASE_PROFILES: DiseaseProfile[] = [
    {
        key: 'wssv', name: 'White Spot Syndrome (WSSV)', libraryScientificName: 'White Spot Syndrome Virus', severity: 'high',
        primary: ['white_spots', 'reduced_feeding', 'lethargy'],
        // erratic_swimming: [WOAH-WSSV] "abnormal swimming behaviour".
        secondary: ['red_discoloration', 'surfacing', 'soft_shell', 'erratic_swimming'],
    },
    {
        key: 'ems', name: 'Early Mortality Syndrome (EMS/AHPND)', libraryScientificName: 'Acute Hepatopancreatic Necrosis Disease', severity: 'high',
        primary: ['empty_gut', 'pale_hepatopancreas', 'reduced_feeding'],
        secondary: ['lethargy', 'soft_shell', 'surfacing'],
    },
    {
        key: 'ehp', name: 'Enterocytozoon hepatopenaei (EHP)', libraryScientificName: 'Enterocytozoon hepatopenaei', severity: 'medium',
        primary: ['size_variation', 'reduced_feeding'],
        secondary: ['empty_gut', 'white_feces', 'pale_hepatopancreas'],
    },
    {
        key: 'wfs', name: 'White Feces Syndrome (WFS)', severity: 'medium',
        primary: ['white_feces', 'reduced_feeding'],
        secondary: ['soft_shell', 'empty_gut', 'lethargy'],
    },
    {
        key: 'vibriosis', name: 'Vibriosis', libraryScientificName: 'Vibrio spp.', severity: 'medium',
        primary: ['red_discoloration', 'lethargy'],
        secondary: ['reduced_feeding', 'black_gills', 'surfacing'],
    },
    {
        key: 'black_gill', name: 'Black Gill Disease', libraryScientificName: 'Various fungi/bacteria', severity: 'medium',
        primary: ['black_gills'],
        secondary: ['lethargy', 'reduced_feeding', 'high_ammonia', 'abnormal_water_color'],
    },
    {
        key: 'white_muscle', name: 'White Muscle Disease', severity: 'medium',
        primary: ['white_muscle'],
        secondary: ['lethargy', 'low_do'],
    },
    {
        key: 'yhd', name: 'Yellow Head Disease (YHD)', libraryScientificName: 'Yellow Head Virus', severity: 'high',
        primary: ['yellow_head', 'reduced_feeding'],
        secondary: ['lethargy', 'surfacing', 'red_discoloration'],
    },
    // ── D8 additions — DRAFT, NOT REVIEWED ──
    {
        // [RMS] whitish abdominal musculature + continuous low-level mortality.
        key: 'rms', name: 'Running Mortality Syndrome (RMS)', libraryScientificName: 'Running Mortality Syndrome', severity: 'high',
        primary: ['white_muscle', 'steady_deaths'],
        secondary: [],
    },
    {
        // [WOAH-IHHN] runt-deformity syndrome: bent rostrum + wide size spread.
        key: 'ihhnv', name: 'IHHNV (runt-deformity syndrome)', severity: 'medium',
        primary: ['deformed_rostrum', 'size_variation'],
        secondary: [],
    },
    {
        // [LSS] space between shell and muscle, shrunken HP; slow steady deaths.
        key: 'lss', name: 'Loose Shell Syndrome (LSS)', severity: 'medium',
        primary: ['loose_shell', 'pale_hepatopancreas'],
        secondary: ['steady_deaths'],
    },
    {
        // [DFO-VIB] + [ZHANG-2020]: luminescence; anorexia; opaque musculature.
        // Library: the seeded "Vibriosis" row (Vibrio spp.) lists "Luminescent
        // Vibriosis" as a common name.
        key: 'luminous_vibriosis', name: 'Luminous vibriosis', libraryScientificName: 'Vibrio spp.', severity: 'medium',
        primary: ['luminescence'],
        secondary: ['reduced_feeding', 'white_muscle'],
    },
];

/**
 * "Confirm with a lab (PCR)" — where to send samples. CURATE BEFORE RELEASE:
 * spec D8.5 wants a curated per-state list (AP/TN/Gujarat/Odisha/WB); until a
 * human curates one these are links to the public pages, each fetched and
 * checked on 2026-09-19. MPEDA's lab page (mpeda.gov.in/?page_id=1083) was
 * left out on purpose: those are ELISA antibiotic-residue labs, not disease
 * PCR labs. The sample guidance text itself is in i18n `diagnose.lab_*`,
 * from WOAH Aquatic Manual ch. 2.2.0 (crustaceans, general information) §1.4,
 * §5.3 and §5.5 — https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/2009/2.2.00_INTRO_CRUSTACEANS.pdf
 */
export const LAB_LINKS: { key: string; name: string; url: string }[] = [
    {
        key: 'ciba_nrld',
        name: 'ICAR-CIBA National Referral Laboratory for Aquatic Animal Diseases (Chennai)',
        url: 'https://ciba.res.in/?page_id=3319',
    },
    {
        key: 'rgca_capl',
        name: 'RGCA (MPEDA) Central Aquaculture Pathology Laboratory (Tamil Nadu)',
        url: 'https://rgca.co.in/f_capl.php',
    },
    {
        key: 'rgca_mobile',
        name: 'RGCA (MPEDA) mobile disease-diagnosis laboratory',
        url: 'https://rgca.co.in/f_mobilevan.php',
    },
];
