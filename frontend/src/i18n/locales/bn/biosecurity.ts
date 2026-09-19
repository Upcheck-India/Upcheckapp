/** Seed PCR + biosecurity checklist (spec D5). Needs native review. */
const biosecurity = {
  seedTitle: 'বীজের স্বাস্থ্য',
  spf: 'SPF বীজ',
  pcr: {
    wssv: 'WSSV (হোয়াইট স্পট)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'নেগেটিভ',
    positive: 'পজিটিভ',
    not_tested: 'পরীক্ষা হয়নি',
  },
  pcrLab: 'PCR ল্যাব',
  pcrDate: 'PCR পরীক্ষার তারিখ',
  warnUntested:
    'WSSV ও EHP-এর PCR পরীক্ষা ছাড়া বীজই এই রোগগুলি পুকুরে ঢোকার সবচেয়ে সাধারণ পথ।',
  warnPositive: 'PCR-পজিটিভ বীজ ছাড়লে ফসল নষ্ট হওয়ার সম্ভাবনা খুব বেশি।',
  positiveTitle: 'PCR-পজিটিভ বীজ',
  stockAnyway: 'তবুও ছাড়ুন',
  progress: 'জৈব নিরাপত্তা {{total}}-এর মধ্যে {{done}}',
  stage: {
    prep: 'পুকুর প্রস্তুতি',
    culture: 'চাষের সময়',
  },
  item: {
    pond_dried: 'পুকুর শুকানো হয়েছে',
    bottom_limed: 'তলায় চুন দেওয়া হয়েছে',
    water_filtered: 'ঢোকার জল ছাঁকা (সূক্ষ্ম জাল)',
    water_disinfected: 'জল জীবাণুমুক্ত করা হয়েছে',
    bird_net: 'পাখির জাল',
    crab_fence: 'কাঁকড়ার বেড়া',
    footbath: 'পুকুরে ফুটবাথ',
    separate_tools: 'প্রতি পুকুরে আলাদা সরঞ্জাম',
    dead_shrimp_disposal: 'মরা চিংড়ি চুন দিয়ে পোঁতা বা পোড়ানো',
  },
  carcassTip: 'মরা চিংড়ি চুন দিয়ে পুঁতে দিন বা পুড়িয়ে ফেলুন। কখনও খালে ফেলবেন না।',
  saveFailed: 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
};

export default biosecurity;
