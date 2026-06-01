const simulations = {
  // ── SimulationListScreen ──────────────────────────────────────────────────
  list: {
    title: 'सिमुलेशन',
    statBiomass: '{{value}} kg जैव भार',
    statProfit: 'लाभ: {{value}}',
    statNa: 'N/A',
    emptyTitle: 'अभी कोई सिमुलेशन नहीं',
    emptyDesc: 'अगले चक्र की प्रभावी योजना बनाने के लिए पहला पूर्वानुमान बनाएं।',
    deleteTitle: 'सिमुलेशन हटाएं',
    deleteMessage: 'यह सहेजा गया सिमुलेशन हटाएं?',
    errorDelete: 'सिमुलेशन हटाने में विफल',
  },

  // ── SimulationCreateScreen ────────────────────────────────────────────────
  create: {
    title: 'नया सिमुलेशन',
    subtitle: 'सक्रिय तालाब चक्र पर what-if परिदृश्य चलाएं',
    sectionPond: 'तालाब',
    labelPondId: 'तालाब ID *',
    placeholderPondId: 'सक्रिय चक्र वाले तालाब का UUID',
    sectionScenario: 'परिदृश्य प्रकार',
    scenarioFeedChange: 'आहार परिवर्तन',
    scenarioPriceChange: 'मूल्य परिवर्तन',
    scenarioStockingDensity: 'स्टॉकिंग घनत्व',
    sectionVariables: 'चर',
    labelFeedPrice: 'आहार मूल्य (प्रति kg)',
    labelGrowthImprovement: 'वृद्धि सुधार (%)',
    labelSellingPrice: 'बिक्री मूल्य (प्रति kg)',
    labelStockingDensity: 'स्टॉकिंग घनत्व (PL/m²)',
    runSimulation: 'सिमुलेशन चलाएं',
    errorPondId: 'कृपया तालाब ID दर्ज करें',
    errorSimFailed: 'सिमुलेशन चलाने में विफल',
    validationTitle: 'सत्यापन त्रुटि',
    simFailedTitle: 'सिमुलेशन विफल',
  },

  // ── SimulationResultsScreen ───────────────────────────────────────────────
  results: {
    title: 'सिमुलेशन परिणाम',
    vsBaseline: 'आधार रेखा बनाम',
    profitDifference: 'लाभ अंतर',
    sectionResults: 'सिमुलेशन परिणाम',
    labelProjectedBiomass: 'प्रक्षेपित जैव भार',
    labelProjectedFcr: 'प्रक्षेपित FCR',
    labelTotalRevenue: 'कुल राजस्व',
    labelTotalCost: 'कुल लागत',
    sectionProfitComparison: 'लाभ तुलना',
    labelBaselineProfit: 'आधार रेखा शुद्ध लाभ:',
    labelSimulatedProfit: 'सिमुलेटेड शुद्ध लाभ:',
    labelRiskWarning: 'जोखिम चेतावनी:',
    noData: 'कोई सिमुलेशन डेटा नहीं मिला।',
  },
};
export default simulations;
