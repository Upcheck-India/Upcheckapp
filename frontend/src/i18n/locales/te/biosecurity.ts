/** Seed PCR + biosecurity checklist (spec D5). Needs native review. */
const biosecurity = {
  seedTitle: 'సీడ్ ఆరోగ్యం',
  spf: 'SPF సీడ్',
  pcr: {
    wssv: 'WSSV (వైట్ స్పాట్)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'నెగటివ్',
    positive: 'పాజిటివ్',
    not_tested: 'పరీక్షించలేదు',
  },
  pcrLab: 'PCR ల్యాబ్',
  pcrDate: 'PCR పరీక్ష తేదీ',
  warnUntested:
    'WSSV, EHP కోసం PCR పరీక్ష చేయని సీడ్ ఈ వ్యాధులు చెరువులోకి వచ్చే అత్యంత సాధారణ మార్గం.',
  warnPositive: 'PCR-పాజిటివ్ సీడ్ వేస్తే పంట విఫలమయ్యే అవకాశం చాలా ఎక్కువ.',
  positiveTitle: 'PCR-పాజిటివ్ సీడ్',
  stockAnyway: 'అయినా వేయి',
  progress: 'బయోసెక్యూరిటీ {{total}}లో {{done}}',
  stage: {
    prep: 'చెరువు తయారీ',
    culture: 'పెంపకం సమయంలో',
  },
  item: {
    pond_dried: 'చెరువు ఎండబెట్టారు',
    bottom_limed: 'అడుగున సున్నం వేశారు',
    water_filtered: 'లోపలికి వచ్చే నీరు వడకట్టారు (సన్నని వల)',
    water_disinfected: 'నీటిని క్రిమిసంహారం చేశారు',
    bird_net: 'పక్షి వల',
    crab_fence: 'పీత కంచె',
    footbath: 'చెరువు వద్ద ఫుట్‌బాత్',
    separate_tools: 'ప్రతి చెరువుకు వేరే పనిముట్లు',
    dead_shrimp_disposal: 'చనిపోయిన రొయ్యలను సున్నంతో పూడ్చారు లేదా కాల్చారు',
  },
  carcassTip: 'చనిపోయిన రొయ్యలను సున్నంతో పూడ్చండి లేదా కాల్చండి. ఎప్పుడూ కాలువల్లో వేయవద్దు.',
  saveFailed: 'సేవ్ కాలేదు. మళ్ళీ ప్రయత్నించండి.',
};

export default biosecurity;
