/** Seed PCR + biosecurity checklist (spec D5). Needs native review. */
const biosecurity = {
  seedTitle: 'ବୀଜର ସ୍ୱାସ୍ଥ୍ୟ',
  spf: 'SPF ବୀଜ',
  pcr: {
    wssv: 'WSSV (ହ୍ୱାଇଟ୍ ସ୍ପଟ୍)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'ନେଗେଟିଭ୍',
    positive: 'ପଜିଟିଭ୍',
    not_tested: 'ପରୀକ୍ଷା ହୋଇନାହିଁ',
  },
  pcrLab: 'PCR ଲ୍ୟାବ୍',
  pcrDate: 'PCR ପରୀକ୍ଷା ତାରିଖ',
  warnUntested:
    'WSSV ଓ EHP ପାଇଁ PCR ପରୀକ୍ଷା ବିନା ବୀଜ ହିଁ ଏହି ରୋଗଗୁଡ଼ିକ ପୋଖରୀକୁ ଆସିବାର ସବୁଠୁ ସାଧାରଣ ବାଟ।',
  warnPositive: 'PCR-ପଜିଟିଭ୍ ବୀଜ ଛାଡ଼ିଲେ ଫସଲ ନଷ୍ଟ ହେବାର ସମ୍ଭାବନା ବହୁତ ଅଧିକ।',
  positiveTitle: 'PCR-ପଜିଟିଭ୍ ବୀଜ',
  stockAnyway: 'ତଥାପି ଛାଡ଼ନ୍ତୁ',
  progress: 'ଜୈବ ସୁରକ୍ଷା {{total}} ମଧ୍ୟରୁ {{done}}',
  stage: {
    prep: 'ପୋଖରୀ ପ୍ରସ୍ତୁତି',
    culture: 'ଚାଷ ସମୟରେ',
  },
  item: {
    pond_dried: 'ପୋଖରୀ ଶୁଖାଗଲା',
    bottom_limed: 'ତଳେ ଚୂନ ଦିଆଗଲା',
    water_filtered: 'ଆସୁଥିବା ପାଣି ଛଣାଗଲା (ସରୁ ଜାଲି)',
    water_disinfected: 'ପାଣି ଜୀବାଣୁମୁକ୍ତ କରାଗଲା',
    bird_net: 'ପକ୍ଷୀ ଜାଲ',
    crab_fence: 'କଙ୍କଡ଼ା ବାଡ଼',
    footbath: 'ପୋଖରୀରେ ଫୁଟବାଥ୍',
    separate_tools: 'ପ୍ରତି ପୋଖରୀ ପାଇଁ ଅଲଗା ଉପକରଣ',
    dead_shrimp_disposal: 'ମରା ଚିଙ୍ଗୁଡ଼ି ଚୂନ ସହ ପୋତାଗଲା ବା ପୋଡ଼ାଗଲା',
  },
  carcassTip: 'ମରା ଚିଙ୍ଗୁଡ଼ିକୁ ଚୂନ ସହ ପୋତି ଦିଅନ୍ତୁ ବା ପୋଡ଼ି ଦିଅନ୍ତୁ। କେବେ ବି କେନାଲରେ ପକାନ୍ତୁ ନାହିଁ।',
  saveFailed: 'ସଞ୍ଚୟ ହେଲା ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
};

export default biosecurity;
