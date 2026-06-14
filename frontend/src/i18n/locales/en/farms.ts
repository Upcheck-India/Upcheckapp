const farms = {
  // FarmsListScreen
  title: 'My Farms',
  ponds: 'Ponds',
  errorTitle: "Couldn't Load Farms",
  emptyTitle: 'No Farms Yet',
  emptySubtitle: 'Create your first farm to start managing your ponds and cycles.',
  addFarm: 'Add Farm',

  // FarmDetailScreen
  noPondsTitle: 'No Ponds Found',
  noPondsSubtitle: 'Add ponds to this farm to begin tracking cycles.',
  addPond: 'Add Pond',
  activeCycle: 'Active Cycle',
  noActiveCycle: 'No Active Cycle',
  errorPondsTitle: "Couldn't Load Ponds",

  // CreateFarmScreen
  fieldFarmName: 'Farm Name',
  placeholderFarmName: 'e.g. North Site',
  fieldAddress: 'Address',
  placeholderAddress: 'Address or Region',
  fieldArea: 'Area (hectares, optional)',
  errorFarmRequired: 'Farm name is required',
  errorCreateFarm: 'Failed to create farm',
  saveFarm: 'Save Farm',
  fieldLocation: 'Farm location',
  detectLocation: 'Detect my location',
  locating: 'Getting location…',
  locationCaptured: 'Location set · {{lat}}, {{lng}}',
  locationDeniedTitle: 'Location permission needed',
  locationDeniedMsg: 'Allow location access to set your farm position for weather and tide features.',
  locationError: 'Could not get your location. Try again.',
  fieldWaterSource: 'Water source',
  water_tidal: 'Tidal',
  water_river: 'River',
  water_borehole: 'Borehole',
  water_reservoir: 'Reservoir',
  water_recycled: 'Recycled',
};
export default farms;
