const simulations = {
  // ── SimulationListScreen ──────────────────────────────────────────────────
  list: {
    title: 'সিমুলেশন',
    statBiomass: '{{value}} kg বায়োমাস',
    statProfit: 'মুনাফা: {{value}}',
    statNa: 'N/A',
    emptyTitle: 'এখনও কোনো সিমুলেশন নেই',
    emptyDesc: 'পরবর্তী চক্র কার্যকরভাবে পরিকল্পনা করতে আপনার প্রথম পূর্বাভাস তৈরি করুন।',
    deleteTitle: 'সিমুলেশন মুছুন',
    deleteMessage: 'এই সংরক্ষিত সিমুলেশনটি সরিয়ে দেবেন?',
    errorDelete: 'সিমুলেশন মুছতে ব্যর্থ',
  },

  // ── SimulationCreateScreen ────────────────────────────────────────────────
  create: {
    title: 'নতুন সিমুলেশন',
    subtitle: 'একটি সক্রিয় পুকুর চক্রে "কী হলে" পরিস্থিতি চালান',
    sectionPond: 'পুকুর',
    labelPondId: 'পুকুর ID *',
    placeholderPondId: 'সক্রিয় চক্র সহ পুকুরের UUID',
    sectionScenario: 'পরিস্থিতির ধরন',
    scenarioFeedChange: 'খাদ্য পরিবর্তন',
    scenarioPriceChange: 'মূল্য পরিবর্তন',
    scenarioStockingDensity: 'মজুদের ঘনত্ব',
    sectionVariables: 'ভেরিয়েবল',
    labelFeedPrice: 'খাদ্যের মূল্য (প্রতি kg)',
    labelGrowthImprovement: 'বৃদ্ধির উন্নতি (%)',
    labelSellingPrice: 'বিক্রয় মূল্য (প্রতি kg)',
    labelStockingDensity: 'মজুদের ঘনত্ব (PL/m²)',
    runSimulation: 'সিমুলেশন চালান',
    errorPondId: 'একটি পুকুর ID লিখুন',
    errorSimFailed: 'সিমুলেশন চালাতে ব্যর্থ',
    validationTitle: 'যাচাইকরণ ত্রুটি',
    simFailedTitle: 'সিমুলেশন ব্যর্থ',
  },

  // ── SimulationResultsScreen ───────────────────────────────────────────────
  results: {
    title: 'সিমুলেশনের ফলাফল',
    vsBaseline: 'বেসলাইনের তুলনায়',
    profitDifference: 'মুনাফার পার্থক্য',
    sectionResults: 'সিমুলেশনের ফলাফল',
    labelProjectedBiomass: 'প্রক্ষেপিত বায়োমাস',
    labelProjectedFcr: 'প্রক্ষেপিত FCR',
    labelTotalRevenue: 'মোট রাজস্ব',
    labelTotalCost: 'মোট খরচ',
    sectionProfitComparison: 'মুনাফার তুলনা',
    labelBaselineProfit: 'বেসলাইন নিট মুনাফা:',
    labelSimulatedProfit: 'সিমুলেটেড নিট মুনাফা:',
    labelRiskWarning: 'ঝুঁকির সতর্কতা:',
    noData: 'কোনো সিমুলেশন ডেটা পাওয়া যায়নি।',
  },
};
export default simulations;
