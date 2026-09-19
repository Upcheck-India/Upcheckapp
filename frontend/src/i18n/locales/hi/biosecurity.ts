/** Seed PCR + biosecurity checklist (spec D5). Needs native review. */
const biosecurity = {
  seedTitle: 'बीज की सेहत',
  spf: 'SPF बीज',
  pcr: {
    wssv: 'WSSV (व्हाइट स्पॉट)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'नेगेटिव',
    positive: 'पॉजिटिव',
    not_tested: 'जांच नहीं हुई',
  },
  pcrLab: 'PCR लैब',
  pcrDate: 'PCR जांच की तारीख',
  warnUntested:
    'WSSV और EHP की PCR जांच के बिना बीज ही इन बीमारियों के तालाब में आने का सबसे आम रास्ता है।',
  warnPositive: 'PCR-पॉजिटिव बीज डालने से फसल के खराब होने की बहुत संभावना है।',
  positiveTitle: 'PCR-पॉजिटिव बीज',
  stockAnyway: 'फिर भी डालें',
  progress: 'जैव सुरक्षा {{total}} में से {{done}}',
  stage: {
    prep: 'तालाब की तैयारी',
    culture: 'पालन के दौरान',
  },
  item: {
    pond_dried: 'तालाब सुखाया',
    bottom_limed: 'तली में चूना डाला',
    water_filtered: 'आने वाला पानी छाना (बारीक जाली)',
    water_disinfected: 'पानी कीटाणुरहित किया',
    bird_net: 'पक्षी जाल',
    crab_fence: 'केकड़ा बाड़',
    footbath: 'तालाब पर फुटबाथ',
    separate_tools: 'हर तालाब के अलग औज़ार',
    dead_shrimp_disposal: 'मरे झींगे चूने के साथ गाड़े या जलाए',
  },
  carcassTip: 'मरे झींगों को चूने के साथ गाड़ दें या जला दें। कभी नहरों में न फेंकें।',
  saveFailed: 'सहेज नहीं सके। कृपया फिर से कोशिश करें।',
};

export default biosecurity;
