const pondSetup = {
  stepCounter: 'చెరువు {{current}} / {{total}}',
  finishLater: 'తర్వాత పూర్తి చేయండి',

  sectionPond: 'చెరువు వివరాలు',
  sectionCulture: 'సాగు వివరాలు',
  sectionAeration: 'గాలింపు',

  fieldName: 'చెరువు పేరు',
  placeholderName: 'ఉదా. A1',

  fieldGeometry: 'చెరువు ఆకారం',
  geom_rectangular: 'దీర్ఘచతురస్రం',
  geom_circular: 'వృత్తాకారం',
  geom_raceway: 'రేస్‌వే',

  fieldDiameter: 'వ్యాసం (m)',
  fieldLength: 'పొడవు (m)',
  fieldWidth: 'వెడల్పు (m)',
  fieldDepth: 'లోతు (m)',
  areaPreview: 'వైశాల్యం: {{area}} m²',

  fieldSpecies: 'జాతి',
  selectSpecies: 'జాతిని ఎంచుకోండి',
  fieldStrain: 'స్ట్రెయిన్ / లైన్',
  selectStrain: 'స్ట్రెయిన్ ఎంచుకోండి',
  fieldHatchery: 'విత్తనం మూలం (హ్యాచరీ)',
  selectHatchery: 'హ్యాచరీని ఎంచుకోండి',

  fieldDensity: 'నిల్వ సాంద్రత (PL/m²)',
  placeholderDensity: 'ఉదా. 40',
  densityHint: 'చదరపు మీటర్‌కు నిల్వ చేసిన పోస్ట్-లార్వా',

  fieldStartDate: 'సాగు ప్రారంభం',
  docHelper: 'ఈరోజు సాగులో {{day}}వ రోజు',

  fieldAeratorCount: 'ఏరేటర్ల సంఖ్య',
  fieldHpPerAerator: 'ఒక్కో ఏరేటర్‌కు HP',
  totalHp: 'మొత్తం అమర్చినది: {{hp}} HP',

  cropSuffix: 'పంట 1',
  saveAndNext: 'సేవ్ చేసి కొనసాగండి',
  finishSetup: 'సెటప్ పూర్తి చేయండి',

  // Validation
  errName: 'అక్షరాంక చెరువు పేరు నమోదు చేయండి',
  errDiameter: 'వ్యాసం 1–400 m మధ్య ఉండాలి',
  errLength: 'పొడవు 1–500 m మధ్య ఉండాలి',
  errWidth: 'వెడల్పు 1–500 m మధ్య ఉండాలి',
  errDepth: 'లోతు 0.5–5.0 m మధ్య ఉండాలి',
  errArea: 'చెరువు వైశాల్యం 10 నుండి 50,000 m² మధ్య ఉండాలి',
  errSpecies: 'జాతిని ఎంచుకోండి',
  errStrain: 'స్ట్రెయిన్ ఎంచుకోండి',
  errHatchery: 'హ్యాచరీని ఎంచుకోండి',
  errDensity: 'చెల్లుబాటు అయ్యే నిల్వ సాంద్రత నమోదు చేయండి',
  errAerator: 'చెల్లుబాటు అయ్యే సంఖ్య నమోదు చేయండి',
  errHp: 'ఒక్కో ఏరేటర్‌కు HP నమోదు చేయండి',
  errSave: 'ఈ చెరువును సేవ్ చేయలేకపోయాం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
};
export default pondSetup;
