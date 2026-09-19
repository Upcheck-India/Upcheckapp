/**
 * Treatment ingredient catalogue (disease spec D2, DD2). Served publicly by
 * `GET /treatments/ingredients` and cached offline by the app.
 *
 * - `bannedKey` ties an ingredient to an entry of the banned list
 *   (`bannedKeyOf` in banned-substance-matcher.ts), so picking it flags
 *   EXACTLY, with no text guessing. Every banned/restricted list entry at HEAD
 *   has one here (a spec asserts it). D1 (banned list v2) gives list entries a
 *   stable `key`; reconcile `bannedKey` against it when D1 lands.
 * - `withdrawalDays` is deliberately absent: it may only be added with a
 *   primary source (instrument + url). The app never invents a period (D3.6).
 * - Native-script names are transliterations awaiting native-speaker review
 *   (spec §5 blocking content work), same rule as D1 aliases.
 */
export const INGREDIENT_CATEGORIES = [
  'mineral',
  'lime_alkalinity',
  'probiotic',
  'disinfectant',
  'oxidiser_oxygen',
  'water_conditioner',
  'feed_additive',
  'antiparasitic',
  'antimicrobial',
  'other',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const TREATMENT_REASONS = [
  'molt_prep',
  'water_quality',
  'disease',
  'prevention',
  'pond_prep',
  'other',
] as const;

export const DOSE_UNITS = ['kg', 'g', 'l', 'ml', 'ppm', 'kg_per_ha'] as const;

export interface IngredientNames {
  en: string;
  hi: string;
  te: string;
  ta: string;
  bn: string;
  or: string;
}

export interface Ingredient {
  key: string;
  category: IngredientCategory;
  names: IngredientNames;
  aliases: string[];
  bannedKey?: string;
  withdrawalDays?: { value: number; source: { instrument: string; url: string } };
}

export const INGREDIENTS_VERSION = '2026-09-19';

export const INGREDIENTS: Ingredient[] = [
  // ── minerals ──
  {
    key: 'potassium_chloride',
    category: 'mineral',
    names: { en: 'Potassium chloride (KCl / MOP)', hi: 'पोटेशियम क्लोराइड', te: 'పొటాషియం క్లోరైడ్', ta: 'பொட்டாசியம் குளோரைடு', bn: 'পটাশিয়াম ক্লোরাইড', or: 'ପୋଟାସିୟମ କ୍ଲୋରାଇଡ' },
    aliases: ['kcl', 'mop', 'muriate of potash', 'potash'],
  },
  {
    key: 'magnesium_chloride',
    category: 'mineral',
    names: { en: 'Magnesium chloride', hi: 'मैग्नीशियम क्लोराइड', te: 'మెగ్నీషియం క్లోరైడ్', ta: 'மெக்னீசியம் குளோரைடு', bn: 'ম্যাগনেসিয়াম ক্লোরাইড', or: 'ମ୍ୟାଗ୍ନେସିୟମ କ୍ଲୋରାଇଡ' },
    aliases: ['mgcl2'],
  },
  {
    key: 'magnesium_sulphate',
    category: 'mineral',
    names: { en: 'Magnesium sulphate (Epsom salt)', hi: 'मैग्नीशियम सल्फेट', te: 'మెగ్నీషియం సల్ఫేట్', ta: 'மெக்னீசியம் சல்பேட்', bn: 'ম্যাগনেসিয়াম সালফেট', or: 'ମ୍ୟାଗ୍ନେସିୟମ ସଲଫେଟ' },
    aliases: ['mgso4', 'epsom salt', 'magnesium sulfate'],
  },
  {
    key: 'calcium_chloride',
    category: 'mineral',
    names: { en: 'Calcium chloride', hi: 'कैल्शियम क्लोराइड', te: 'కాల్షియం క్లోరైడ్', ta: 'கால்சியம் குளோரைடு', bn: 'ক্যালসিয়াম ক্লোরাইড', or: 'କ୍ୟାଲସିୟମ କ୍ଲୋରାଇଡ' },
    aliases: ['cacl2'],
  },
  {
    key: 'dolomite',
    category: 'mineral',
    names: { en: 'Dolomite', hi: 'डोलोमाइट', te: 'డోలమైట్', ta: 'டோலமைட்', bn: 'ডলোমাইট', or: 'ଡୋଲୋମାଇଟ' },
    aliases: ['dolomite'],
  },
  // ── lime / alkalinity ──
  {
    key: 'calcium_carbonate',
    category: 'lime_alkalinity',
    names: { en: 'Agricultural lime (calcium carbonate)', hi: 'कृषि चूना (कैल्शियम कार्बोनेट)', te: 'వ్యవసాయ సున్నం (కాల్షియం కార్బొనేట్)', ta: 'விவசாய சுண்ணாம்பு (கால்சியம் கார்பனேட்)', bn: 'কৃষি চুন (ক্যালসিয়াম কার্বনেট)', or: 'କୃଷି ଚୂନ (କ୍ୟାଲସିୟମ କାର୍ବୋନେଟ)' },
    aliases: ['caco3', 'agri lime', 'agricultural lime', 'limestone'],
  },
  {
    key: 'calcium_oxide',
    category: 'lime_alkalinity',
    names: { en: 'Quicklime (calcium oxide)', hi: 'बिना बुझा चूना (कैल्शियम ऑक्साइड)', te: 'పొడి సున్నం (కాల్షియం ఆక్సైడ్)', ta: 'சுட்ட சுண்ணாம்பு (கால்சியம் ஆக்சைடு)', bn: 'কলিচুন (ক্যালসিয়াম অক্সাইড)', or: 'ପୋଡ଼ା ଚୂନ (କ୍ୟାଲସିୟମ ଅକ୍ସାଇଡ)' },
    aliases: ['cao', 'quicklime', 'quick lime'],
  },
  // ── probiotics ──
  {
    key: 'bacillus',
    category: 'probiotic',
    names: { en: 'Probiotic (Bacillus spp.)', hi: 'प्रोबायोटिक (बैसिलस)', te: 'ప్రోబయోటిక్ (బాసిల్లస్)', ta: 'புரோபயாட்டிக் (பேசில்லஸ்)', bn: 'প্রোবায়োটিক (ব্যাসিলাস)', or: 'ପ୍ରୋବାୟୋଟିକ (ବାସିଲସ)' },
    aliases: ['bacillus', 'probiotic', 'probiotics'],
  },
  // ── disinfectants ──
  {
    key: 'bkc',
    category: 'disinfectant',
    names: { en: 'Benzalkonium chloride (BKC)', hi: 'बेंजाल्कोनियम क्लोराइड (BKC)', te: 'బెంజాల్కోనియం క్లోరైడ్ (BKC)', ta: 'பென்சால்கோனியம் குளோரைடு (BKC)', bn: 'বেনজালকোনিয়াম ক্লোরাইড (BKC)', or: 'ବେଞ୍ଜାଲକୋନିୟମ କ୍ଲୋରାଇଡ (BKC)' },
    aliases: ['bkc', 'benzalkonium'],
  },
  {
    key: 'iodine',
    category: 'disinfectant',
    names: { en: 'Iodine / povidone-iodine', hi: 'आयोडीन / पोविडोन-आयोडीन', te: 'అయోడిన్ / పోవిడోన్-అయోడిన్', ta: 'அயோடின் / போவிடோன்-அயோடின்', bn: 'আয়োডিন / পোভিডোন-আয়োডিন', or: 'ଆୟୋଡିନ / ପୋଭିଡୋନ-ଆୟୋଡିନ' },
    aliases: ['iodine', 'povidone', 'pvp iodine'],
  },
  {
    key: 'bleaching_powder',
    category: 'disinfectant',
    names: { en: 'Bleaching powder / chlorine', hi: 'ब्लीचिंग पाउडर / क्लोरीन', te: 'బ్లీచింగ్ పౌడర్ / క్లోరిన్', ta: 'பிளீச்சிங் பவுடர் / குளோரின்', bn: 'ব্লিচিং পাউডার / ক্লোরিন', or: 'ବ୍ଲିଚିଂ ପାଉଡର / କ୍ଲୋରିନ' },
    aliases: ['bleaching powder', 'chlorine', 'calcium hypochlorite', 'tcca'],
  },
  {
    key: 'potassium_permanganate',
    category: 'disinfectant',
    names: { en: 'Potassium permanganate (KMnO₄)', hi: 'पोटेशियम परमैंगनेट', te: 'పొటాషియం పర్మాంగనేట్', ta: 'பொட்டாசியம் பெர்மாங்கனேட்', bn: 'পটাশিয়াম পারম্যাঙ্গানেট', or: 'ପୋଟାସିୟମ ପରମାଙ୍ଗାନେଟ' },
    aliases: ['kmno4', 'potassium permanganate'],
  },
  {
    key: 'formalin',
    category: 'disinfectant',
    names: { en: 'Formalin', hi: 'फॉर्मेलिन', te: 'ఫార్మాలిన్', ta: 'ஃபார்மலின்', bn: 'ফরমালিন', or: 'ଫର୍ମାଲିନ' },
    aliases: ['formalin', 'formaldehyde'],
  },
  // ── oxygen ──
  {
    key: 'hydrogen_peroxide',
    category: 'oxidiser_oxygen',
    names: { en: 'Hydrogen peroxide (H₂O₂)', hi: 'हाइड्रोजन पेरोक्साइड', te: 'హైడ్రోజన్ పెరాక్సైడ్', ta: 'ஹைட்ரஜன் பெராக்சைடு', bn: 'হাইড্রোজেন পারক্সাইড', or: 'ହାଇଡ୍ରୋଜେନ ପେରକ୍ସାଇଡ' },
    aliases: ['h2o2', 'hydrogen peroxide'],
  },
  {
    key: 'sodium_percarbonate',
    category: 'oxidiser_oxygen',
    names: { en: 'Oxygen granules (sodium percarbonate)', hi: 'ऑक्सीजन दाने (सोडियम परकार्बोनेट)', te: 'ఆక్సిజన్ గుళికలు (సోడియం పెర్కార్బొనేట్)', ta: 'ஆக்சிஜன் குருணைகள் (சோடியம் பெர்கார்பனேட்)', bn: 'অক্সিজেন দানা (সোডিয়াম পারকার্বনেট)', or: 'ଅମ୍ଳଜାନ ଦାନା (ସୋଡିୟମ ପରକାର୍ବୋନେଟ)' },
    aliases: ['oxygen granules', 'oxygen tablets', 'percarbonate'],
  },
  // ── water conditioners / feed additives ──
  {
    key: 'zeolite',
    category: 'water_conditioner',
    names: { en: 'Zeolite', hi: 'जिओलाइट', te: 'జియోలైట్', ta: 'சியோலைட்', bn: 'জিওলাইট', or: 'ଜିଓଲାଇଟ' },
    aliases: ['zeolite'],
  },
  {
    key: 'yucca',
    category: 'water_conditioner',
    names: { en: 'Yucca extract', hi: 'युक्का', te: 'యుక్కా', ta: 'யுக்கா', bn: 'ইউকা', or: 'ୟୁକା' },
    aliases: ['yucca'],
  },
  {
    key: 'vitamin_c',
    category: 'feed_additive',
    names: { en: 'Vitamin C', hi: 'विटामिन सी', te: 'విటమిన్ సి', ta: 'வைட்டமின் சி', bn: 'ভিটামিন সি', or: 'ଭିଟାମିନ ସି' },
    aliases: ['vitamin c', 'ascorbic acid'],
  },
  // ── banned / restricted list entries (bannedKey = bannedKeyOf(list entry)) ──
  {
    key: 'chloramphenicol',
    category: 'antimicrobial',
    bannedKey: 'chloramphenicol',
    names: { en: 'Chloramphenicol', hi: 'क्लोरैम्फेनिकॉल', te: 'క్లోరాంఫెనికాల్', ta: 'குளோராம்பெனிகால்', bn: 'ক্লোরামফেনিকল', or: 'କ୍ଲୋରାମଫେନିକଲ' },
    aliases: ['chloramphenicol'],
  },
  {
    key: 'nitrofurans',
    category: 'antimicrobial',
    bannedKey: 'nitrofurans',
    names: { en: 'Nitrofurans (e.g. furazolidone)', hi: 'नाइट्रोफ्यूरान', te: 'నైట్రోఫ్యూరాన్లు', ta: 'நைட்ரோஃபியூரான்கள்', bn: 'নাইট্রোফিউরান', or: 'ନାଇଟ୍ରୋଫ୍ୟୁରାନ' },
    aliases: ['nitrofuran', 'furazolidone'],
  },
  {
    key: 'fluoroquinolones',
    category: 'antimicrobial',
    bannedKey: 'fluoroquinolones',
    names: { en: 'Fluoroquinolones (e.g. enrofloxacin, ciprofloxacin)', hi: 'फ्लोरोक्विनोलोन', te: 'ఫ్లోరోక్వినోలోన్లు', ta: 'ஃப்ளோரோகுயினோலோன்கள்', bn: 'ফ্লুরোকুইনোলোন', or: 'ଫ୍ଲୋରୋକ୍ୱିନୋଲୋନ' },
    aliases: ['enrofloxacin', 'ciprofloxacin', 'norfloxacin'],
  },
  {
    key: 'nitroimidazoles',
    category: 'antimicrobial',
    bannedKey: 'nitroimidazoles',
    names: { en: 'Nitroimidazoles (e.g. metronidazole)', hi: 'नाइट्रोइमिडाजोल', te: 'నైట్రోఇమిడజోల్లు', ta: 'நைட்ரோஇமிடசோல்கள்', bn: 'নাইট্রোইমিডাজোল', or: 'ନାଇଟ୍ରୋଇମିଡାଜୋଲ' },
    aliases: ['metronidazole'],
  },
  {
    key: 'colistin',
    category: 'antimicrobial',
    bannedKey: 'colistin',
    names: { en: 'Colistin', hi: 'कोलिस्टिन', te: 'కొలిస్టిన్', ta: 'கொலிஸ்டின்', bn: 'কোলিস্টিন', or: 'କୋଲିଷ୍ଟିନ' },
    aliases: ['colistin'],
  },
  {
    key: 'neomycin',
    category: 'antimicrobial',
    bannedKey: 'neomycin',
    names: { en: 'Neomycin', hi: 'नियोमाइसिन', te: 'నియోమైసిన్', ta: 'நியோமைசின்', bn: 'নিওমাইসিন', or: 'ନିଓମାଇସିନ' },
    aliases: ['neomycin'],
  },
  {
    key: 'nalidixic_acid',
    category: 'antimicrobial',
    bannedKey: 'nalidixic_acid',
    names: { en: 'Nalidixic acid', hi: 'नेलिडिक्सिक एसिड', te: 'నాలిడిక్సిక్ యాసిడ్', ta: 'நாலிடிக்சிக் அமிலம்', bn: 'ন্যালিডিক্সিক অ্যাসিড', or: 'ନାଲିଡିକ୍ସିକ ଏସିଡ' },
    aliases: ['nalidixic'],
  },
  {
    key: 'sulfamethoxazole',
    category: 'antimicrobial',
    bannedKey: 'sulfamethoxazole',
    names: { en: 'Sulfamethoxazole', hi: 'सल्फामेथोक्साजोल', te: 'సల్ఫామెథాక్సజోల్', ta: 'சல்பாமெதாக்சசோல்', bn: 'সালফামেথোক্সাজোল', or: 'ସଲଫାମେଥୋକ୍ସାଜୋଲ' },
    aliases: ['sulfamethoxazole'],
  },
  {
    key: 'oxytetracycline',
    category: 'antimicrobial',
    bannedKey: 'oxytetracycline',
    names: { en: 'Oxytetracycline', hi: 'ऑक्सीटेट्रासाइक्लिन', te: 'ఆక్సిటెట్రాసైక్లిన్', ta: 'ஆக்சிடெட்ராசைக்ளின்', bn: 'অক্সিটেট্রাসাইক্লিন', or: 'ଅକ୍ସିଟେଟ୍ରାସାଇକ୍ଲିନ' },
    aliases: ['oxytetracycline', 'otc'],
  },
  {
    key: 'chloroform',
    category: 'other',
    bannedKey: 'chloroform',
    names: { en: 'Chloroform', hi: 'क्लोरोफॉर्म', te: 'క్లోరోఫామ్', ta: 'குளோரோஃபார்ம்', bn: 'ক্লোরোফর্ম', or: 'କ୍ଲୋରୋଫର୍ମ' },
    aliases: ['chloroform'],
  },
  {
    key: 'aristolochia',
    category: 'other',
    bannedKey: 'aristolochia',
    names: { en: 'Aristolochia', hi: 'एरिस्टोलोकिया', te: 'అరిస్టోలోకియా', ta: 'அரிஸ்டோலோக்கியா', bn: 'অ্যারিস্টোলোকিয়া', or: 'ଆରିଷ୍ଟୋଲୋକିଆ' },
    aliases: ['aristolochia'],
  },
];

export const INGREDIENTS_BY_KEY = new Map(INGREDIENTS.map((i) => [i.key, i]));
