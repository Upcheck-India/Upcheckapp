const pondSetup = {
  stepCounter: 'குளம் {{current}} / {{total}}',
  finishLater: 'பின்னர் முடிக்கவும்',

  sectionPond: 'குள விவரங்கள்',
  sectionCulture: 'வளர்ப்பு விவரங்கள்',
  sectionAeration: 'காற்றூட்டம்',

  fieldName: 'குளத்தின் பெயர்',
  placeholderName: 'எ.கா. A1',

  fieldGeometry: 'குளத்தின் வடிவம்',
  geom_rectangular: 'செவ்வக',
  geom_circular: 'வட்ட',
  geom_raceway: 'ரேஸ்வே',

  fieldDiameter: 'விட்டம் (m)',
  fieldLength: 'நீளம் (m)',
  fieldWidth: 'அகலம் (m)',
  fieldDepth: 'ஆழம் (m)',
  areaPreview: 'பரப்பளவு: {{area}} m²',

  fieldSpecies: 'இனங்கள்',
  selectSpecies: 'இனத்தைத் தேர்ந்தெடு',
  fieldStrain: 'இனவகை / வம்சம்',
  selectStrain: 'இனவகையைத் தேர்ந்தெடு',
  fieldHatchery: 'விதை பெறப்பட்ட இடம் (குஞ்சு பொரிப்பகம்)',
  selectHatchery: 'குஞ்சு பொரிப்பகத்தைத் தேர்ந்தெடு',

  fieldDensity: 'இருப்பு அடர்த்தி (PL/m²)',
  placeholderDensity: 'எ.கா. 40',
  densityHint: 'ஒரு சதுர மீட்டருக்கு விடப்படும் குஞ்சுகள் (PL)',

  fieldStartDate: 'வளர்ப்பு தொடக்கம்',
  docHelper: 'இன்று வளர்ப்பின் {{day}}ஆம் நாள்',

  fieldAeratorCount: 'காற்றூட்டிகளின் எண்ணிக்கை',
  fieldHpPerAerator: 'ஒரு காற்றூட்டிக்கு HP',
  totalHp: 'மொத்த நிறுவியது: {{hp}} HP',

  cropSuffix: 'பயிர் 1',
  saveAndNext: 'சேமித்து தொடர்',
  finishSetup: 'அமைப்பை முடி',

  // Validation
  errName: 'எழுத்து/எண் கொண்ட குளப் பெயரை உள்ளிடுக',
  errDiameter: 'விட்டம் 1–400 m இருக்க வேண்டும்',
  errLength: 'நீளம் 1–500 m இருக்க வேண்டும்',
  errWidth: 'அகலம் 1–500 m இருக்க வேண்டும்',
  errDepth: 'ஆழம் 0.5–5.0 m இருக்க வேண்டும்',
  errArea: 'குள பரப்பளவு 10 முதல் 50,000 m² இடையே இருக்க வேண்டும்',
  errSpecies: 'ஒரு இனத்தைத் தேர்ந்தெடு',
  errStrain: 'ஒரு இனவகையைத் தேர்ந்தெடு',
  errHatchery: 'ஒரு குஞ்சு பொரிப்பகத்தைத் தேர்ந்தெடு',
  errDensity: 'சரியான இருப்பு அடர்த்தியை உள்ளிடுக',
  errAerator: 'சரியான எண்ணை உள்ளிடுக',
  errHp: 'ஒரு காற்றூட்டிக்கு HP உள்ளிடுக',
  errSave: 'இந்த குளத்தைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
};
export default pondSetup;
