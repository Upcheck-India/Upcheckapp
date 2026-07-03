const pondSetup = {
  stepCounter: 'तालाब {{current}} / {{total}}',
  finishLater: 'बाद में पूरा करें',

  sectionPond: 'तालाब विवरण',
  sectionCulture: 'संवर्धन विवरण',
  sectionAeration: 'वायुयन',

  fieldName: 'तालाब का नाम',
  placeholderName: 'e.g. A1',

  fieldGeometry: 'तालाब का आकार',
  geom_rectangular: 'आयताकार',
  geom_circular: 'गोलाकार',
  geom_raceway: 'रेसवे',

  fieldDiameter: 'व्यास (m)',
  fieldLength: 'लंबाई (m)',
  fieldWidth: 'चौड़ाई (m)',
  fieldDepth: 'गहराई (m)',
  areaPreview: 'क्षेत्रफल: {{area}} m²',

  fieldSpecies: 'प्रजाति',
  selectSpecies: 'प्रजाति चुनें',
  fieldStrain: 'स्ट्रेन / लाइन',
  selectStrain: 'स्ट्रेन चुनें',
  fieldHatchery: 'बीज का स्रोत (हैचरी)',
  selectHatchery: 'हैचरी चुनें',

  fieldDensity: 'स्टॉकिंग घनत्व (PL/m²)',
  placeholderDensity: 'e.g. 40',
  densityHint: 'प्रति वर्ग मीटर स्टॉक किए गए पोस्ट-लार्वा',

  fieldStartDate: 'संवर्धन की शुरुआत',
  docHelper: 'आज संवर्धन का दिन {{day}}',

  fieldAeratorCount: 'एयरेटर की संख्या',
  fieldHpPerAerator: 'प्रति एयरेटर HP',
  totalHp: 'कुल स्थापित: {{hp}} HP',

  cropSuffix: 'फसल 1',
  saveAndNext: 'सहेजें और जारी रखें',
  finishSetup: 'सेटअप पूरा करें',

  // Validation
  errName: 'अल्फ़ान्यूमेरिक तालाब नाम दर्ज करें',
  errDiameter: 'व्यास 1–400 m के बीच होना चाहिए',
  errLength: 'लंबाई 1–500 m के बीच होनी चाहिए',
  errWidth: 'चौड़ाई 1–500 m के बीच होनी चाहिए',
  errDepth: 'गहराई 0.5–5.0 m के बीच होनी चाहिए',
  errArea: 'तालाब क्षेत्रफल 10 और 50,000 m² के बीच होना चाहिए',
  errSpecies: 'एक प्रजाति चुनें',
  errStrain: 'एक स्ट्रेन चुनें',
  errHatchery: 'एक हैचरी चुनें',
  errDensity: 'वैध स्टॉकिंग घनत्व दर्ज करें',
  errAerator: 'वैध संख्या दर्ज करें',
  errHp: 'प्रति एयरेटर HP दर्ज करें',
  errSave: 'यह तालाब सहेजा नहीं जा सका। कृपया पुनः प्रयास करें।',
};
export default pondSetup;
