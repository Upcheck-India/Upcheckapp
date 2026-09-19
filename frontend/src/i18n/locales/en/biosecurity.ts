/** Seed PCR + biosecurity checklist (spec D5). */
const biosecurity = {
  seedTitle: 'Seed health',
  spf: 'SPF seed',
  pcr: {
    wssv: 'WSSV (white spot)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'Negative',
    positive: 'Positive',
    not_tested: 'Not tested',
  },
  pcrLab: 'PCR lab',
  pcrDate: 'PCR test date',
  warnUntested:
    'Seed without a PCR test for WSSV and EHP is the most common way these diseases enter a pond.',
  warnPositive: 'Stocking PCR-positive seed is very likely to fail the crop.',
  positiveTitle: 'PCR-positive seed',
  stockAnyway: 'Stock anyway',
  progress: 'Biosecurity {{done}} of {{total}}',
  stage: {
    prep: 'Pond preparation',
    culture: 'During culture',
  },
  item: {
    pond_dried: 'Pond dried',
    bottom_limed: 'Bottom limed',
    water_filtered: 'Inlet water filtered (fine mesh)',
    water_disinfected: 'Water disinfected',
    bird_net: 'Bird net',
    crab_fence: 'Crab fence',
    footbath: 'Footbath at the pond',
    separate_tools: 'Separate tools for each pond',
    dead_shrimp_disposal: 'Dead shrimp buried with lime or burned',
  },
  carcassTip: 'Bury dead shrimp with lime or burn them. Never throw them into canals.',
  saveFailed: 'Could not save. Please try again.',
};

export default biosecurity;
