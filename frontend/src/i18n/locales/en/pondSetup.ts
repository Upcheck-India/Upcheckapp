const pondSetup = {
  stepCounter: 'Pond {{current}} of {{total}}',
  finishLater: 'Finish later',

  sectionPond: 'Pond details',
  sectionCulture: 'Culture details',
  sectionAeration: 'Aeration',

  fieldName: 'Pond name',
  placeholderName: 'e.g. A1',

  fieldGeometry: 'Pond shape',
  geom_rectangular: 'Rectangular',
  geom_circular: 'Circular',
  geom_raceway: 'Raceway',

  fieldDiameter: 'Diameter (m)',
  fieldLength: 'Length (m)',
  fieldWidth: 'Width (m)',
  fieldDepth: 'Depth (m)',
  areaPreview: 'Area: {{area}} m²',

  fieldSpecies: 'Species',
  selectSpecies: 'Select species',
  fieldStrain: 'Strain / line',
  selectStrain: 'Select strain',
  fieldHatchery: 'Seed sourced from (hatchery)',
  selectHatchery: 'Select hatchery',

  fieldDensity: 'Stocking density (PL/m²)',
  placeholderDensity: 'e.g. 40',
  densityHint: 'Post-larvae stocked per square metre',

  fieldStartDate: 'Start of culture',
  docHelper: 'Day {{day}} of culture today',

  fieldAeratorCount: 'No. of aerators',
  fieldHpPerAerator: 'HP per aerator',
  totalHp: 'Total installed: {{hp}} HP',

  cropSuffix: 'Crop 1',
  saveAndNext: 'Save & continue',
  finishSetup: 'Finish setup',

  // Validation
  errName: 'Enter an alphanumeric pond name',
  errDiameter: 'Diameter must be 1–400 m',
  errLength: 'Length must be 1–500 m',
  errWidth: 'Width must be 1–500 m',
  errDepth: 'Depth must be 0.5–5.0 m',
  errArea: 'Pond area must be between 10 and 50,000 m²',
  errSpecies: 'Select a species',
  errStrain: 'Select a strain',
  errHatchery: 'Select a hatchery',
  errDensity: 'Enter a valid stocking density',
  errAerator: 'Enter a valid number',
  errHp: 'Enter HP per aerator',
  errSave: "Couldn't save this pond. Please try again.",
};
export default pondSetup;
