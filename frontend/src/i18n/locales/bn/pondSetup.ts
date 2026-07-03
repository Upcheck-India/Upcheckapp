const pondSetup = {
  stepCounter: 'পুকুর {{current}} / {{total}}',
  finishLater: 'পরে সম্পূর্ণ করুন',

  sectionPond: 'পুকুরের বিবরণ',
  sectionCulture: 'চাষের বিবরণ',
  sectionAeration: 'বায়ুসঞ্চালন',

  fieldName: 'পুকুরের নাম',
  placeholderName: 'যেমন: A1',

  fieldGeometry: 'পুকুরের আকৃতি',
  geom_rectangular: 'আয়তাকার',
  geom_circular: 'বৃত্তাকার',
  geom_raceway: 'রেসওয়ে',

  fieldDiameter: 'ব্যাস (m)',
  fieldLength: 'দৈর্ঘ্য (m)',
  fieldWidth: 'প্রস্থ (m)',
  fieldDepth: 'গভীরতা (m)',
  areaPreview: 'এলাকা: {{area}} m²',

  fieldSpecies: 'প্রজাতি',
  selectSpecies: 'প্রজাতি নির্বাচন করুন',
  fieldStrain: 'স্ট্রেন / লাইন',
  selectStrain: 'স্ট্রেন নির্বাচন করুন',
  fieldHatchery: 'বীজের উৎস (হ্যাচারি)',
  selectHatchery: 'হ্যাচারি নির্বাচন করুন',

  fieldDensity: 'মজুদ ঘনত্ব (PL/m²)',
  placeholderDensity: 'যেমন: 40',
  densityHint: 'প্রতি বর্গমিটারে মজুদকৃত পোস্ট-লার্ভা',

  fieldStartDate: 'চাষ শুরুর তারিখ',
  docHelper: 'আজ চাষের {{day}} দিন',

  fieldAeratorCount: 'অ্যারেটরের সংখ্যা',
  fieldHpPerAerator: 'প্রতি অ্যারেটর HP',
  totalHp: 'মোট স্থাপিত: {{hp}} HP',

  cropSuffix: 'ফসল ১',
  saveAndNext: 'সংরক্ষণ করে এগিয়ে যান',
  finishSetup: 'সেটআপ সম্পূর্ণ করুন',

  // Validation
  errName: 'একটি অক্ষরসংখ্যার পুকুরের নাম লিখুন',
  errDiameter: 'ব্যাস অবশ্যই 1–400 m হতে হবে',
  errLength: 'দৈর্ঘ্য অবশ্যই 1–500 m হতে হবে',
  errWidth: 'প্রস্থ অবশ্যই 1–500 m হতে হবে',
  errDepth: 'গভীরতা অবশ্যই 0.5–5.0 m হতে হবে',
  errArea: 'পুকুরের এলাকা 10 থেকে 50,000 m²-এর মধ্যে হতে হবে',
  errSpecies: 'একটি প্রজাতি নির্বাচন করুন',
  errStrain: 'একটি স্ট্রেন নির্বাচন করুন',
  errHatchery: 'একটি হ্যাচারি নির্বাচন করুন',
  errDensity: 'একটি সঠিক মজুদ ঘনত্ব লিখুন',
  errAerator: 'একটি সঠিক সংখ্যা লিখুন',
  errHp: 'প্রতি অ্যারেটর HP লিখুন',
  errSave: 'এই পুকুরটি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
};
export default pondSetup;
