/** Seed PCR + biosecurity checklist (spec D5). Needs native review. */
const biosecurity = {
  seedTitle: 'விதை ஆரோக்கியம்',
  spf: 'SPF விதை',
  pcr: {
    wssv: 'WSSV (வெள்ளைப் புள்ளி)',
    ehp: 'EHP',
    ahpnd: 'AHPND (EMS)',
    ihhnv: 'IHHNV',
  },
  result: {
    negative: 'நெகட்டிவ்',
    positive: 'பாசிட்டிவ்',
    not_tested: 'சோதிக்கவில்லை',
  },
  pcrLab: 'PCR ஆய்வகம்',
  pcrDate: 'PCR சோதனை தேதி',
  warnUntested:
    'WSSV, EHP-க்கு PCR சோதனை செய்யாத விதைதான் இந்த நோய்கள் குளத்துக்குள் வரும் மிகப் பொதுவான வழி.',
  warnPositive: 'PCR-பாசிட்டிவ் விதையை இருப்பு செய்தால் பயிர் தோல்வியடைய வாய்ப்பு மிக அதிகம்.',
  positiveTitle: 'PCR-பாசிட்டிவ் விதை',
  stockAnyway: 'இருந்தாலும் இருப்பு செய்',
  progress: 'உயிர் பாதுகாப்பு {{total}}-ல் {{done}}',
  stage: {
    prep: 'குளம் தயாரிப்பு',
    culture: 'வளர்ப்பின் போது',
  },
  item: {
    pond_dried: 'குளம் உலர்த்தப்பட்டது',
    bottom_limed: 'அடியில் சுண்ணாம்பு இடப்பட்டது',
    water_filtered: 'உள்வரும் நீர் வடிகட்டப்பட்டது (நுண் வலை)',
    water_disinfected: 'நீர் கிருமி நீக்கம் செய்யப்பட்டது',
    bird_net: 'பறவை வலை',
    crab_fence: 'நண்டு வேலி',
    footbath: 'குளத்தில் கால் கழுவும் தொட்டி',
    separate_tools: 'ஒவ்வொரு குளத்துக்கும் தனி கருவிகள்',
    dead_shrimp_disposal: 'இறந்த இறால் சுண்ணாம்புடன் புதைக்கப்பட்டது அல்லது எரிக்கப்பட்டது',
  },
  carcassTip: 'இறந்த இறாலை சுண்ணாம்புடன் புதையுங்கள் அல்லது எரியுங்கள். ஒருபோதும் கால்வாயில் போடாதீர்கள்.',
  saveFailed: 'சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
};

export default biosecurity;
