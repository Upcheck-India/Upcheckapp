const history = {
  // ── Shared across all history screens ─────────────────────────────────────
  couldNotLoad: 'ରେକର୍ଡ ଲୋଡ୍ ହୋଇପାରିଲା ନାହିଁ',

  // ── ChemicalHistoryScreen ─────────────────────────────────────────────────
  chemicalTitle: 'ରାସାୟନିକ ଇତିହାସ',
  chemicalDeleteMsg: '{{date}} ତାରିଖର ରାସାୟନିକ ଲଗ୍ ଡିଲିଟ୍ କରିବେ?',
  chemicalEmptyTitle: 'କୌଣସି ରାସାୟନିକ ଲଗ୍ ନାହିଁ',
  chemicalEmptyText: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ରାସାୟନିକ ତଥ୍ୟ ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── DiseaseHistoryScreen ──────────────────────────────────────────────────
  diseaseTitle: 'ରୋଗ ଇତିହାସ',
  diseaseIdLabel: 'ରୋଗ ID: {{id}}',
  diseasePhotoCount: '{{count}}ଟି ଫଟୋ',
  diseaseEmptyTitle: 'କୌଣସି ରୋଗ ଲଗ୍ ନାହିଁ',
  diseaseEmptyText: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ରୋଗ ଘଟଣା ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── FeedHistoryScreen ─────────────────────────────────────────────────────
  feedTitle: 'ଖାଦ୍ୟ ଇତିହାସ',
  feedTotalLabel: 'ମୋଟ ଖାଦ୍ୟ: ',
  feedTotalValue: '{{amount}} kg',
  feedTypeLabel: 'ପ୍ରକାର: {{type}}',
  feedMethodLabel: 'ପ୍ରଣାଳୀ: {{method}}',
  feedEmptyTitle: 'କୌଣସି ଖାଦ୍ୟ ରେକର୍ଡ ନାହିଁ',
  feedEmptyText: 'ଖପତ ଟ୍ର୍ୟାକ୍ କରିବାକୁ ଖାଦ୍ୟ ଲଗ୍ ଆରମ୍ଭ କରନ୍ତୁ।',

  // ── HarvestHistoryScreen ──────────────────────────────────────────────────
  harvestTitle: 'ଫସଲ ରେକର୍ଡ',
  harvestTotalLabel: 'ମୋଟ ଜୈବ ଭର: ',
  harvestTotalValue: '{{amount}} kg',
  harvestMetricBiomass: 'ମୋଟ ଜୈବ ଭର',
  harvestMetricAvgSize: 'ହାରାହାରି ଆକାର',
  harvestBuyerLabel: 'କ୍ରେତା: {{name}}',
  harvestSaleLabel: 'ବିକ୍ରୟ: {{amount}}',
  harvestEmptyTitle: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ନାହିଁ',
  harvestEmptyText: 'ଏହି ପୋଖରିରେ ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── MicrobiologyHistoryScreen ─────────────────────────────────────────────
  microbiologyTitle: 'ଅଣୁଜୀବ ବିଜ୍ଞାନ ଇତିହାସ',
  microbiologyDeleteMsg: '{{date}} ତାରିଖର ଅଣୁଜୀବ ଲଗ୍ ଡିଲିଟ୍ କରିବେ?',
  microbiologyLevelCritical: 'ଗଭୀର',
  microbiologyLevelWarning: 'ସତର୍କ',
  microbiologyLevelSafe: 'ସୁରକ୍ଷିତ',
  microbiologyLevelNa: 'N/A',
  microbiologyEmptyTitle: 'କୌଣସି ଅଣୁଜୀବ ଲଗ୍ ନାହିଁ',
  microbiologyEmptyText: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ଅଣୁଜୀବ ତଥ୍ୟ ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── MortalityHistoryScreen ────────────────────────────────────────────────
  mortalityTitle: 'ମୃତ୍ୟୁ ଇତିହାସ',
  mortalityDeleteMsg: '{{date}} ତାରିଖର ମୃତ୍ୟୁ ରେକର୍ଡ ଡିଲିଟ୍ କରିବେ?',
  mortalityDeleteError: 'ରେକର୍ଡ ଡିଲିଟ୍ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  mortalityTotalLabel: 'ମୋଟ ମୃତ୍ୟୁ: ',
  mortalityEstWeight: 'ଆନୁ. ଓଜନ: {{weight}} kg',
  mortalityEmptyTitle: 'କୌଣସି ମୃତ୍ୟୁ ଲଗ୍ ହୋଇନାହିଁ',
  mortalityEmptyText: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ମୃତ୍ୟୁ ତଥ୍ୟ ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── PlanktonHistoryScreen ─────────────────────────────────────────────────
  planktonTitle: 'ପ୍ଲାଙ୍କ୍ଟନ ଇତିହାସ',
  planktonDeleteMsg: '{{date}} ତାରିଖର ପ୍ଲାଙ୍କ୍ଟନ ଲଗ୍ ଡିଲିଟ୍ କରିବେ?',
  planktonTotalLabel: 'ମୋଟ: {{total}} cells/mL',
  planktonEmptyTitle: 'କୌଣସି ପ୍ଲାଙ୍କ୍ଟନ ଲଗ୍ ନାହିଁ',
  planktonEmptyText: 'ଏ ପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ଲାଙ୍କ୍ଟନ ତଥ୍ୟ ରେକର୍ଡ ହୋଇନାହିଁ।',

  // ── SamplingHistoryScreen ─────────────────────────────────────────────────
  samplingTitle: 'ନମୁନା ଇତିହାସ',
  samplingDeleteMsg: '{{date}} ତାରିଖର ନମୁନା ରେକର୍ଡ ଡିଲିଟ୍ କରିବେ?',
  samplingDeleteError: 'ରେକର୍ଡ ଡିଲିଟ୍ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  samplingPillSamples: 'ନମୁନା',
  samplingPillBiomass: 'ଜୈବ ଭର',
  samplingPillSr: 'SR',
  samplingEmptyTitle: 'କୌଣସି ନମୁନା ରେକର୍ଡ ନାହିଁ',
  samplingEmptyText: 'ସମୟ ସହ ବୃଦ୍ଧି ଟ୍ର୍ୟାକ୍ କରିବାକୁ ନମୁନା ଆରମ୍ଭ କରନ୍ତୁ।',

  // ── TreatmentHistoryScreen ────────────────────────────────────────────────
  treatmentTitle: 'ଚିକିତ୍ସା ଇତିହାସ',
  treatmentEmptyTitle: 'କୌଣସି ଚିକିତ୍ସା ଲଗ୍ ହୋଇନାହିଁ',
  treatmentEmptyText: 'ଏହି ପୋଖରିରେ କୌଣସି ଚିକିତ୍ସା ରେକର୍ଡ ନାହିଁ।',

  // ── WaterQualityHistoryScreen ─────────────────────────────────────────────
  waterQualityTitle: 'ଜଳ ଗୁଣମାନ ଇତିହାସ',
  waterQualityDeleteMsg: 'ଆପଣ ଏହି ଜଳ ଗୁଣମାନ ରେକର୍ଡ ଡିଲିଟ୍ କରିବାକୁ ନିଶ୍ଚିତ ତ? ଏହା ପୁଣି ଫେରାଇ ଆଣି ହୁଏ ନାହିଁ।',
  waterQualityDeleteError: 'ରେକର୍ଡ ଡିଲିଟ୍ ହୋଇପାରିଲା ନାହିଁ',
  waterQualityCompareTitle: 'ପ୍ୟାରାମିଟର ତୁଳନା',
  waterQualityMetricPh: 'pH',
  waterQualityMetricDo: 'DO (mg/L)',
  waterQualityMetricTemp: 'ତାପ (°C)',
  waterQualityMetricSalinity: 'ଲବଣତା',
  waterQualityEmptyTitle: 'କୌଣସି ଜଳ ଗୁଣମାନ ଲଗ୍ ନାହିଁ',
  waterQualityEmptyText: 'ଧାରା ଦେଖିବାକୁ ଜଳ ଗୁଣମାନ ରେକର୍ଡ ଆରମ୍ଭ କରନ୍ତୁ।',
};
export default history;
