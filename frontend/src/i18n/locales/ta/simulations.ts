const simulations = {
  // ── SimulationListScreen ──────────────────────────────────────────────────
  list: {
    title: 'உருவகப்படுத்தல்கள்',
    statBiomass: '{{value}} kg உயிரி நிறை',
    statProfit: 'லாபம்: {{value}}',
    statNa: 'பொருந்தாது',
    emptyTitle: 'உருவகப்படுத்தல்கள் இன்னும் இல்லை',
    emptyDesc: 'அடுத்த சுழற்சியை திட்டமிட உங்கள் முதல் முன்கணிப்பை உருவாக்கவும்.',
    deleteTitle: 'உருவகப்படுத்தலை நீக்கு',
    deleteMessage: 'இந்த சேமிக்கப்பட்ட உருவகப்படுத்தலை நீக்கவா?',
    errorDelete: 'உருவகப்படுத்தலை நீக்க முடியவில்லை',
  },

  // ── SimulationCreateScreen ────────────────────────────────────────────────
  create: {
    title: 'புதிய உருவகப்படுத்தல்',
    subtitle: 'செயலில் உள்ள குளச் சுழற்சியில் "என்னாகும்" காட்சியை இயக்கு',
    sectionPond: 'குளம்',
    labelPondId: 'குளம் ID *',
    placeholderPondId: 'செயலில் உள்ள சுழற்சியுடன் குளத்தின் UUID',
    sectionScenario: 'காட்சி வகை',
    scenarioFeedChange: 'தீவன மாற்றம்',
    scenarioPriceChange: 'விலை மாற்றம்',
    scenarioStockingDensity: 'கையிருப்பு அடர்த்தி',
    sectionVariables: 'மாறிகள்',
    labelFeedPrice: 'தீவன விலை (kg-க்கு)',
    labelGrowthImprovement: 'வளர்ச்சி மேம்பாடு (%)',
    labelSellingPrice: 'விற்பனை விலை (kg-க்கு)',
    labelStockingDensity: 'கையிருப்பு அடர்த்தி (PL/m²)',
    runSimulation: 'உருவகப்படுத்தல் இயக்கு',
    errorPondId: 'குளம் ID உள்ளிடவும்',
    errorSimFailed: 'உருவகப்படுத்தலை இயக்க முடியவில்லை',
    validationTitle: 'சரிபார்ப்பு பிழை',
    simFailedTitle: 'உருவகப்படுத்தல் தோல்வியடைந்தது',
  },

  // ── SimulationResultsScreen ───────────────────────────────────────────────
  results: {
    title: 'உருவகப்படுத்தல் முடிவுகள்',
    vsBaseline: 'அடிப்படையுடன் ஒப்பிடு',
    profitDifference: 'லாப வேறுபாடு',
    sectionResults: 'உருவகப்படுத்தல் முடிவுகள்',
    labelProjectedBiomass: 'கணிக்கப்பட்ட உயிரி நிறை',
    labelProjectedFcr: 'கணிக்கப்பட்ட FCR',
    labelTotalRevenue: 'மொத்த வருவாய்',
    labelTotalCost: 'மொத்த செலவு',
    sectionProfitComparison: 'லாப ஒப்பீடு',
    labelBaselineProfit: 'அடிப்படை நிகர லாபம்:',
    labelSimulatedProfit: 'உருவகப்படுத்தல் நிகர லாபம்:',
    labelRiskWarning: 'அபாய எச்சரிக்கை:',
    noData: 'உருவகப்படுத்தல் தரவு எதுவும் இல்லை.',
  },
};
export default simulations;
