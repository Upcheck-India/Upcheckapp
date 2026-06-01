const simulations = {
  // ── SimulationListScreen ──────────────────────────────────────────────────
  list: {
    title: 'Simulations',
    statBiomass: '{{value}} kg Biomass',
    statProfit: 'Profit: {{value}}',
    statNa: 'N/A',
    emptyTitle: 'No Simulations yet',
    emptyDesc: 'Create your first forecast to plan your next cycle effectively.',
    deleteTitle: 'Delete simulation',
    deleteMessage: 'Remove this saved simulation?',
    errorDelete: 'Failed to delete simulation',
  },

  // ── SimulationCreateScreen ────────────────────────────────────────────────
  create: {
    title: 'New Simulation',
    subtitle: 'Run a what-if scenario on an active pond cycle',
    sectionPond: 'Pond',
    labelPondId: 'Pond ID *',
    placeholderPondId: 'UUID of the pond with an active cycle',
    sectionScenario: 'Scenario Type',
    scenarioFeedChange: 'Feed Change',
    scenarioPriceChange: 'Price Change',
    scenarioStockingDensity: 'Stocking Density',
    sectionVariables: 'Variables',
    labelFeedPrice: 'Feed Price (per kg)',
    labelGrowthImprovement: 'Growth Improvement (%)',
    labelSellingPrice: 'Selling Price (per kg)',
    labelStockingDensity: 'Stocking Density (PL/m²)',
    runSimulation: 'Run Simulation',
    errorPondId: 'Please enter a Pond ID',
    errorSimFailed: 'Failed to run simulation',
    validationTitle: 'Validation Error',
    simFailedTitle: 'Simulation Failed',
  },

  // ── SimulationResultsScreen ───────────────────────────────────────────────
  results: {
    title: 'Simulation Results',
    vsBaseline: 'vs baseline',
    profitDifference: 'Profit Difference',
    sectionResults: 'Simulation Results',
    labelProjectedBiomass: 'Projected Biomass',
    labelProjectedFcr: 'Projected FCR',
    labelTotalRevenue: 'Total Revenue',
    labelTotalCost: 'Total Cost',
    sectionProfitComparison: 'Profit Comparison',
    labelBaselineProfit: 'Baseline Net Profit:',
    labelSimulatedProfit: 'Simulated Net Profit:',
    labelRiskWarning: 'Risk Warning:',
    noData: 'No simulation data found.',
  },
};
export default simulations;
