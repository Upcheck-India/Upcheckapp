const pondSetup = {
  stepCounter: '{{total}} ମଧ୍ୟରୁ ପୋଖରୀ {{current}}',
  finishLater: 'ପରେ ସମାପ୍ତ କରନ୍ତୁ',

  sectionPond: 'ପୋଖରୀ ବିବରଣୀ',
  sectionCulture: 'ଚାଷ ବିବରଣୀ',
  sectionAeration: 'ବାୟୁଚଳନ',

  fieldName: 'ପୋଖରୀ ନାମ',
  placeholderName: 'e.g. A1',

  fieldGeometry: 'ପୋଖରୀ ଆକୃତି',
  geom_rectangular: 'ଆୟତାକାର',
  geom_circular: 'ବୃତ୍ତାକାର',
  geom_raceway: 'ରେସୱେ',

  fieldDiameter: 'ବ୍ୟାସ (m)',
  fieldLength: 'ଲମ୍ବ (m)',
  fieldWidth: 'ଓସାର (m)',
  fieldDepth: 'ଗଭୀରତା (m)',
  areaPreview: 'କ୍ଷେତ୍ରଫଳ: {{area}} m²',

  fieldSpecies: 'ପ୍ରଜାତି',
  selectSpecies: 'ପ୍ରଜାତି ବାଛନ୍ତୁ',
  fieldStrain: 'ଷ୍ଟ୍ରେନ / ଲାଇନ',
  selectStrain: 'ଷ୍ଟ୍ରେନ ବାଛନ୍ତୁ',
  fieldHatchery: 'ବିହନ ଉତ୍ସ (ହ୍ୟାଚରି)',
  selectHatchery: 'ହ୍ୟାଚରି ବାଛନ୍ତୁ',

  fieldDensity: 'ମହଜୁଦ ଘନତା (PL/m²)',
  placeholderDensity: 'e.g. 40',
  densityHint: 'ପ୍ରତି ବର୍ଗ ମିଟରରେ ମହଜୁଦ ପୋଷ୍ଟ-ଲାର୍ଭା',

  fieldStartDate: 'ଚାଷ ଆରମ୍ଭ',
  docHelper: 'ଆଜି ଚାଷର {{day}} ଦିନ',

  fieldAeratorCount: 'ଏରେଟର ସଂଖ୍ୟା',
  fieldHpPerAerator: 'ପ୍ରତି ଏରେଟର HP',
  totalHp: 'ମୋଟ ସ୍ଥାପିତ: {{hp}} HP',

  cropSuffix: 'ଫସଲ 1',
  saveAndNext: 'ସଞ୍ଚୟ କରି ଜାରି ରଖନ୍ତୁ',
  finishSetup: 'ସେଟଅପ ସମାପ୍ତ କରନ୍ତୁ',

  // Validation
  errName: 'ଏକ ଅକ୍ଷରାଙ୍କୀୟ ପୋଖରୀ ନାମ ଦିଅନ୍ତୁ',
  errDiameter: 'ବ୍ୟାସ 1–400 m ମଧ୍ୟରେ ହେବା ଆବଶ୍ୟକ',
  errLength: 'ଲମ୍ବ 1–500 m ମଧ୍ୟରେ ହେବା ଆବଶ୍ୟକ',
  errWidth: 'ଓସାର 1–500 m ମଧ୍ୟରେ ହେବା ଆବଶ୍ୟକ',
  errDepth: 'ଗଭୀରତା 0.5–5.0 m ମଧ୍ୟରେ ହେବା ଆବଶ୍ୟକ',
  errArea: 'ପୋଖରୀ କ୍ଷେତ୍ରଫଳ 10 ରୁ 50,000 m² ମଧ୍ୟରେ ହେବା ଆବଶ୍ୟକ',
  errSpecies: 'ଏକ ପ୍ରଜାତି ବାଛନ୍ତୁ',
  errStrain: 'ଏକ ଷ୍ଟ୍ରେନ ବାଛନ୍ତୁ',
  errHatchery: 'ଏକ ହ୍ୟାଚରି ବାଛନ୍ତୁ',
  errDensity: 'ଏକ ବୈଧ ମହଜୁଦ ଘନତା ଦିଅନ୍ତୁ',
  errAerator: 'ଏକ ବୈଧ ସଂଖ୍ୟା ଦିଅନ୍ତୁ',
  errHp: 'ପ୍ରତି ଏରେଟର HP ଦିଅନ୍ତୁ',
  errSave: 'ଏହି ପୋଖରୀ ସଞ୍ଚୟ ହୋଇ ପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
};
export default pondSetup;
