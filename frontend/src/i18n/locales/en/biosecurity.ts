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
  loading: 'Loading seed health and biosecurity checklist…',
  loadFailed: 'Could not load seed health and biosecurity. Check your internet and try again.',
  seedWhy: 'Lab test results for the seed you stocked. Tested, disease-free seed keeps the biggest diseases out of your pond.',
  checklistWhy: 'Simple steps that stop disease from getting into your pond. Tick each one when it is done.',
  selfReported: 'You tick these yourself — Upcheck does not check them.',
  itemWhy: {
    pond_dried: 'Dry the empty pond bottom in the sun until it cracks. Sunlight kills germs left from the last crop.',
    bottom_limed: 'Spread lime on the bottom. It fixes soil acidity and kills germs.',
    water_filtered: 'Put a fine net on the inlet. It stops crabs, fish and their eggs that carry disease.',
    water_disinfected: 'Treat the water (e.g. with bleaching powder) before stocking. It kills germs in the water.',
    bird_net: 'Net over the pond. Birds carry disease from other ponds and eat shrimp.',
    crab_fence: 'Low fence around the pond. Crabs carry white spot and dig holes in the bunds.',
    footbath: 'Disinfectant tray at the entry to step in. Stops germs coming in on feet.',
    separate_tools: 'Do not share nets, buckets or trays between ponds. Shared tools spread disease.',
    dead_shrimp_disposal: 'Bury dead shrimp with lime or burn them. Left in the open they spread disease.',
  },
};

export default biosecurity;
