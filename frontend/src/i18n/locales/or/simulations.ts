const simulations = {
  // ── SimulationListScreen ──────────────────────────────────────────────────
  list: {
    title: 'ସିମୁଲେସନ',
    statBiomass: '{{value}} kg ବାୟୋମାସ',
    statProfit: 'ଲାଭ: {{value}}',
    statNa: 'N/A',
    emptyTitle: 'ଏପର୍ଯ୍ୟନ୍ତ ସିମୁଲେସନ ନାହିଁ',
    emptyDesc: 'ପରବର୍ତ୍ତୀ ଚକ୍ର ଯୋଜନା ଦୃଢ଼ ଭାବେ ପ୍ରଥମ ପୂର୍ବାନୁମାନ ତୈରି କରନ୍ତୁ।',
    deleteTitle: 'ସିମୁଲେସନ ଡିଲିଟ',
    deleteMessage: 'ଏହି ସଞ୍ଚିତ ସିମୁଲେସନ ସରାଇ ଦିଅ?',
    errorDelete: 'ସିମୁଲେସନ ଡିଲିଟ ବିଫଳ',
  },

  // ── SimulationCreateScreen ────────────────────────────────────────────────
  create: {
    title: 'ନୂଆ ସିମୁଲେସନ',
    subtitle: 'ଏକ ସଚ୍ଛଳ ପୋଖରୀ ଚକ୍ରରେ what-if ପରିସ୍ଥିତି ଚଲାନ୍ତୁ',
    sectionPond: 'ପୋଖରୀ',
    labelPondId: 'ପୋଖରୀ ID *',
    placeholderPondId: 'ସଚ୍ଛଳ ଚକ୍ର ଥିବା ପୋଖରୀ UUID',
    sectionScenario: 'ପରିସ୍ଥିତି ପ୍ରକାର',
    scenarioFeedChange: 'ଖାଦ୍ୟ ପରିବର୍ତ୍ତନ',
    scenarioPriceChange: 'ମୂଲ୍ୟ ପରିବର୍ତ୍ତନ',
    scenarioStockingDensity: 'ଷ୍ଟକ ଘନତ୍ୱ',
    sectionVariables: 'ଚଳ',
    labelFeedPrice: 'ଖାଦ୍ୟ ମୂଲ୍ୟ (ପ୍ରତି kg)',
    labelGrowthImprovement: 'ବୃଦ୍ଧି ଉନ୍ନତି (%)',
    labelSellingPrice: 'ବିକ୍ରୟ ମୂଲ୍ୟ (ପ୍ରତି kg)',
    labelStockingDensity: 'ଷ୍ଟକ ଘନତ୍ୱ (PL/m²)',
    runSimulation: 'ସିମୁଲେସନ ଚଲାନ୍ତୁ',
    errorPondId: 'ପୋଖରୀ ID ଦିଅନ୍ତୁ',
    errorSimFailed: 'ସିମୁଲେସନ ଚଲାଇ ହୋଇ ପାରିଲା ନାହିଁ',
    validationTitle: 'ଯୋଗ୍ୟତା ତ୍ରୁଟି',
    simFailedTitle: 'ସିମୁଲେସନ ବିଫଳ',
  },

  // ── SimulationResultsScreen ───────────────────────────────────────────────
  results: {
    title: 'ସିମୁଲେସନ ଫଳାଫଳ',
    vsBaseline: 'ଆଧାର ରେଖା ତୁଳନାରେ',
    profitDifference: 'ଲାଭ ପ୍ରଭେଦ',
    sectionResults: 'ସିମୁଲେସନ ଫଳାଫଳ',
    labelProjectedBiomass: 'ଅଭିକ୍ଷିପ୍ତ ବାୟୋମାସ',
    labelProjectedFcr: 'ଅଭିକ୍ଷିପ୍ତ FCR',
    labelTotalRevenue: 'ମୋଟ ଆୟ',
    labelTotalCost: 'ମୋଟ ଖର୍ଚ',
    sectionProfitComparison: 'ଲାଭ ତୁଳନା',
    labelBaselineProfit: 'ଆଧାର ରେଖା ନିଟ ଲାଭ:',
    labelSimulatedProfit: 'ସିମୁଲେଟ ନିଟ ଲାଭ:',
    labelRiskWarning: 'ଝୁଁକି ସଂଘଟନ:',
    noData: 'ସିମୁଲେସନ ଡାଟା ମିଳିଲା ନାହିଁ।',
  },
};
export default simulations;
