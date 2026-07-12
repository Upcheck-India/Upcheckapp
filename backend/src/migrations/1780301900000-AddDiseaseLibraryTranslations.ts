import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-language symptoms/prevention/treatment text for the seeded disease
 * library (hi/ta/te/bn/or) — closes the gap where DiseaseListScreen's own
 * chrome was fully localized but the actual disease content underneath it
 * was English-only with no schema to hold a translation at all.
 *
 * Disease names/scientific names/common-name abbreviations (WSSV, EHP,
 * AHPND/EMS…) are intentionally NOT duplicated here — those stay on
 * disease_library only, matching the industry convention of keeping disease
 * codes untranslated across Indian aquaculture literature.
 */
export class AddDiseaseLibraryTranslations1780301900000
  implements MigrationInterface
{
  name = 'AddDiseaseLibraryTranslations1780301900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "disease_library_translations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "disease_id" uuid NOT NULL,
        "locale" varchar(8) NOT NULL,
        "symptoms" text[] DEFAULT '{}',
        "prevention_measures" text[] DEFAULT '{}',
        "treatment_recommendations" text[] DEFAULT '{}',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_disease_library_translations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_disease_library_translations_disease" FOREIGN KEY ("disease_id")
          REFERENCES "disease_library"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_disease_library_translations_disease_locale"
        ON "disease_library_translations" ("disease_id", "locale")
    `);

    // Seed rows only for the diseases this migration knows about (matched by
    // scientific_name, same technique the original seed migration's down()
    // uses) — if disease_library is empty (fresh env, seed migration not run
    // yet) or already has different rows, this silently seeds nothing rather
    // than failing the deploy.
    const translations: Array<{
      scientificName: string;
      locale: string;
      symptoms: string[];
      prevention: string[];
      treatment: string[];
    }> = [
      // ── Hindi ──────────────────────────────────────────────────────────
      { scientificName: 'Acute Hepatopancreatic Necrosis Disease', locale: 'hi', symptoms: ['खाली पेट', 'पीला हेपेटोपैंक्रियास', 'नरम खोल', 'सुस्त तैराकी'], prevention: ['संगरोध', 'अच्छी जल गुणवत्ता', 'कीटाणुशोधन'], treatment: ['प्रोबायोटिक्स', 'जल विनिमय', 'चूना प्रयोग'] },
      { scientificName: 'White Spot Syndrome Virus', locale: 'hi', symptoms: ['कवच पर सफेद समावेशन', 'कम आहार ग्रहण', 'मृत्यु दर'], prevention: ['जैवसुरक्षा', 'स्क्रीनिंग'], treatment: ['कोई इलाज नहीं', 'संक्रमित तालाबों को हटाएं'] },
      { scientificName: 'Enterocytozoon hepatopenaei', locale: 'hi', symptoms: ['वृद्धि अवरोध', 'सफेद मल सिंड्रोम', 'कम आहार रूपांतरण'], prevention: ['SPF पोस्ट-लार्वा का उपयोग करें', 'जैवसुरक्षा'], treatment: ['कोई प्रभावी उपचार नहीं', 'हटाएं और कीटाणुरहित करें'] },
      { scientificName: 'Infectious Myonecrosis Virus', locale: 'hi', symptoms: ['मांसपेशी परिगलन', 'सफेद नेक्रोटिक घाव', 'उच्च मृत्यु दर'], prevention: ['SPF स्टॉक', 'जैवसुरक्षा'], treatment: ['कोई इलाज नहीं', 'निष्कासन'] },
      { scientificName: 'Vibrio spp.', locale: 'hi', symptoms: ['चमक', 'नेक्रोटिक घाव', 'लाल रंगत'], prevention: ['प्रोबायोटिक्स', 'अच्छी जल गुणवत्ता'], treatment: ['एंटीबायोटिक्स', 'प्रोबायोटिक्स', 'जल विनिमय'] },
      { scientificName: 'Various fungi/bacteria', locale: 'hi', symptoms: ['काले गलफड़े के रेशे', 'कम श्वसन'], prevention: ['अच्छी जल गुणवत्ता'], treatment: ['जल विनिमय', 'चूना'] },
      { scientificName: 'Running Mortality Syndrome', locale: 'hi', symptoms: ['क्रमिक मृत्यु दर', 'नरम खोल', 'पीला हेपेटोपैंक्रियास'], prevention: ['जैवसुरक्षा', 'संगरोध'], treatment: ['प्रोबायोटिक्स', 'विटामिन'] },
      { scientificName: 'Shell Disease', locale: 'hi', symptoms: ['खोल पर भूरे/काले धब्बे', 'खोल का क्षरण'], prevention: ['अच्छी जल गुणवत्ता', 'चोट से बचें'], treatment: ['चूना प्रयोग', 'जल गुणवत्ता में सुधार'] },
      { scientificName: 'Taura Syndrome Virus', locale: 'hi', symptoms: ['क्यूटिकुलर एपिथेलियम घाव', 'लाल पूंछ'], prevention: ['SPF स्टॉक', 'जैवसुरक्षा'], treatment: ['कोई इलाज नहीं', 'निष्कासन'] },
      { scientificName: 'Yellow Head Virus', locale: 'hi', symptoms: ['पीला सिर', 'कम आहार ग्रहण', 'मृत्यु दर'], prevention: ['SPF स्टॉक', 'स्क्रीनिंग'], treatment: ['कोई इलाज नहीं', 'निष्कासन'] },

      // ── Tamil ──────────────────────────────────────────────────────────
      { scientificName: 'Acute Hepatopancreatic Necrosis Disease', locale: 'ta', symptoms: ['காலி வயிறு', 'வெளிறிய கல்லீரல்-கணையம்', 'மென்மையான ஓடுகள்', 'மந்தமான நீச்சல்'], prevention: ['தனிமைப்படுத்தல்', 'நல்ல நீர் தரம்', 'கிருமி நீக்கம்'], treatment: ['ப்ரோபயாடிக்ஸ்', 'நீர் மாற்றம்', 'சுண்ணாம்பு பயன்பாடு'] },
      { scientificName: 'White Spot Syndrome Virus', locale: 'ta', symptoms: ['ஓட்டில் வெள்ளை உள்ளடக்கங்கள்', 'குறைந்த தீவனம்', 'இறப்பு'], prevention: ['உயிர்பாதுகாப்பு', 'திரையிடல்'], treatment: ['மருந்து இல்லை', 'பாதிக்கப்பட்ட குளங்களை அகற்றவும்'] },
      { scientificName: 'Enterocytozoon hepatopenaei', locale: 'ta', symptoms: ['வளர்ச்சி பின்தங்கல்', 'வெள்ளை மலம் நோய்க்குறி', 'குறைந்த தீவன மாற்று விகிதம்'], prevention: ['SPF பிந்தைய லார்வாவைப் பயன்படுத்தவும்', 'உயிர்பாதுகாப்பு'], treatment: ['பயனுள்ள சிகிச்சை இல்லை', 'அகற்றி கிருமி நீக்கம் செய்யவும்'] },
      { scientificName: 'Infectious Myonecrosis Virus', locale: 'ta', symptoms: ['தசை நெக்ரோசிஸ்', 'வெள்ளை நெக்ரோடிக் புண்கள்', 'அதிக இறப்பு'], prevention: ['SPF கையிருப்பு', 'உயிர்பாதுகாப்பு'], treatment: ['மருந்து இல்லை', 'அகற்றுதல்'] },
      { scientificName: 'Vibrio spp.', locale: 'ta', symptoms: ['ஒளிர்தல்', 'நெக்ரோடிக் புண்கள்', 'சிவப்பு நிற மாற்றம்'], prevention: ['ப்ரோபயாடிக்ஸ்', 'நல்ல நீர் தரம்'], treatment: ['நுண்ணுயிர் எதிர்ப்பிகள்', 'ப்ரோபயாடிக்ஸ்', 'நீர் மாற்றம்'] },
      { scientificName: 'Various fungi/bacteria', locale: 'ta', symptoms: ['கருப்பு செவுள் இழைகள்', 'குறைந்த சுவாசம்'], prevention: ['நல்ல நீர் தரம்'], treatment: ['நீர் மாற்றம்', 'சுண்ணாம்பு'] },
      { scientificName: 'Running Mortality Syndrome', locale: 'ta', symptoms: ['படிப்படியான இறப்பு', 'மென்மையான ஓடுகள்', 'வெளிறிய கல்லீரல்-கணையம்'], prevention: ['உயிர்பாதுகாப்பு', 'தனிமைப்படுத்தல்'], treatment: ['ப்ரோபயாடிக்ஸ்', 'வைட்டமின்கள்'] },
      { scientificName: 'Shell Disease', locale: 'ta', symptoms: ['ஓட்டில் பழுப்பு/கருப்பு புள்ளிகள்', 'ஓடு அரிப்பு'], prevention: ['நல்ல நீர் தரம்', 'காயத்தைத் தவிர்க்கவும்'], treatment: ['சுண்ணாம்பு பயன்பாடு', 'நீர் தரத்தை மேம்படுத்தவும்'] },
      { scientificName: 'Taura Syndrome Virus', locale: 'ta', symptoms: ['க்யூட்டிகுலர் எபிதீலியம் புண்கள்', 'சிவப்பு வால்'], prevention: ['SPF கையிருப்பு', 'உயிர்பாதுகாப்பு'], treatment: ['மருந்து இல்லை', 'அகற்றுதல்'] },
      { scientificName: 'Yellow Head Virus', locale: 'ta', symptoms: ['மஞ்சள் தலை', 'குறைந்த தீவனம்', 'இறப்பு'], prevention: ['SPF கையிருப்பு', 'திரையிடல்'], treatment: ['மருந்து இல்லை', 'அகற்றுதல்'] },

      // ── Telugu ─────────────────────────────────────────────────────────
      { scientificName: 'Acute Hepatopancreatic Necrosis Disease', locale: 'te', symptoms: ['ఖాళీ కడుపు', 'లేత హెపటోప్యాంక్రియాస్', 'మెత్తని పెంకులు', 'నెమ్మదైన ఈత'], prevention: ['నిర్బంధం', 'మంచి నీటి నాణ్యత', 'క్రిమిసంహారణ'], treatment: ['ప్రోబయోటిక్స్', 'నీటి మార్పిడి', 'సున్నం వాడకం'] },
      { scientificName: 'White Spot Syndrome Virus', locale: 'te', symptoms: ['పెంకుపై తెల్లని చేరికలు', 'తగ్గిన దాణా', 'మరణాలు'], prevention: ['జీవభద్రత', 'స్క్రీనింగ్'], treatment: ['చికిత్స లేదు', 'సోకిన చెరువులను తొలగించండి'] },
      { scientificName: 'Enterocytozoon hepatopenaei', locale: 'te', symptoms: ['పెరుగుదల ఆలస్యం', 'తెల్ల మల సిండ్రోమ్', 'తగ్గిన దాణా మార్పిడి'], prevention: ['SPF పోస్ట్-లార్వాలను ఉపయోగించండి', 'జీవభద్రత'], treatment: ['ప్రభావవంతమైన చికిత్స లేదు', 'తొలగించి క్రిమిసంహారణ చేయండి'] },
      { scientificName: 'Infectious Myonecrosis Virus', locale: 'te', symptoms: ['కండరాల నెక్రోసిస్', 'తెల్ల నెక్రోటిక్ గాయాలు', 'అధిక మరణాలు'], prevention: ['SPF నిల్వలు', 'జీవభద్రత'], treatment: ['చికిత్స లేదు', 'తొలగించండి'] },
      { scientificName: 'Vibrio spp.', locale: 'te', symptoms: ['ప్రకాశం', 'నెక్రోటిక్ గాయాలు', 'ఎర్రటి రంగు మార్పు'], prevention: ['ప్రోబయోటిక్స్', 'మంచి నీటి నాణ్యత'], treatment: ['యాంటీబయాటిక్స్', 'ప్రోబయోటిక్స్', 'నీటి మార్పిడి'] },
      { scientificName: 'Various fungi/bacteria', locale: 'te', symptoms: ['నల్ల మొప్ప తంతువులు', 'తగ్గిన శ్వాసక్రియ'], prevention: ['మంచి నీటి నాణ్యత'], treatment: ['నీటి మార్పిడి', 'సున్నం'] },
      { scientificName: 'Running Mortality Syndrome', locale: 'te', symptoms: ['క్రమంగా పెరుగుతున్న మరణాలు', 'మెత్తని పెంకులు', 'లేత హెపటోప్యాంక్రియాస్'], prevention: ['జీవభద్రత', 'నిర్బంధం'], treatment: ['ప్రోబయోటిక్స్', 'విటమిన్లు'] },
      { scientificName: 'Shell Disease', locale: 'te', symptoms: ['పెంకుపై గోధుమ/నల్ల మచ్చలు', 'పెంకు కోత'], prevention: ['మంచి నీటి నాణ్యత', 'గాయాన్ని నివారించండి'], treatment: ['సున్నం వాడకం', 'నీటి నాణ్యతను మెరుగుపరచండి'] },
      { scientificName: 'Taura Syndrome Virus', locale: 'te', symptoms: ['క్యూటికులర్ ఎపిథీలియం గాయాలు', 'ఎర్రటి తోక'], prevention: ['SPF నిల్వలు', 'జీవభద్రత'], treatment: ['చికిత్స లేదు', 'తొలగించండి'] },
      { scientificName: 'Yellow Head Virus', locale: 'te', symptoms: ['పసుపు తల', 'తగ్గిన దాణా', 'మరణాలు'], prevention: ['SPF నిల్వలు', 'స్క్రీనింగ్'], treatment: ['చికిత్స లేదు', 'తొలగించండి'] },

      // ── Bengali ────────────────────────────────────────────────────────
      { scientificName: 'Acute Hepatopancreatic Necrosis Disease', locale: 'bn', symptoms: ['খালি পাকস্থলী', 'ফ্যাকাশে হেপাটোপ্যানক্রিয়াস', 'নরম খোলস', 'ধীর সাঁতার'], prevention: ['কোয়ারেন্টাইন', 'ভালো পানির গুণমান', 'জীবাণুমুক্তকরণ'], treatment: ['প্রোবায়োটিক', 'পানি বিনিময়', 'চুন প্রয়োগ'] },
      { scientificName: 'White Spot Syndrome Virus', locale: 'bn', symptoms: ['খোলসে সাদা অন্তর্ভুক্তি', 'কম খাদ্য গ্রহণ', 'মৃত্যুহার'], prevention: ['জৈব নিরাপত্তা', 'স্ক্রিনিং'], treatment: ['কোনো নিরাময় নেই', 'সংক্রমিত পুকুর অপসারণ করুন'] },
      { scientificName: 'Enterocytozoon hepatopenaei', locale: 'bn', symptoms: ['বৃদ্ধি বিলম্ব', 'সাদা মল সিন্ড্রোম', 'কম খাদ্য রূপান্তর'], prevention: ['SPF পোস্ট-লার্ভা ব্যবহার করুন', 'জৈব নিরাপত্তা'], treatment: ['কার্যকর চিকিৎসা নেই', 'অপসারণ ও জীবাণুমুক্ত করুন'] },
      { scientificName: 'Infectious Myonecrosis Virus', locale: 'bn', symptoms: ['পেশী নেক্রোসিস', 'সাদা নেক্রোটিক ক্ষত', 'উচ্চ মৃত্যুহার'], prevention: ['SPF মজুদ', 'জৈব নিরাপত্তা'], treatment: ['কোনো নিরাময় নেই', 'অপসারণ'] },
      { scientificName: 'Vibrio spp.', locale: 'bn', symptoms: ['দীপ্তি', 'নেক্রোটিক ক্ষত', 'লাল বিবর্ণতা'], prevention: ['প্রোবায়োটিক', 'ভালো পানির গুণমান'], treatment: ['অ্যান্টিবায়োটিক', 'প্রোবায়োটিক', 'পানি বিনিময়'] },
      { scientificName: 'Various fungi/bacteria', locale: 'bn', symptoms: ['কালো ফুলকা তন্তু', 'কম শ্বসন'], prevention: ['ভালো পানির গুণমান'], treatment: ['পানি বিনিময়', 'চুন'] },
      { scientificName: 'Running Mortality Syndrome', locale: 'bn', symptoms: ['ক্রমবর্ধমান মৃত্যুহার', 'নরম খোলস', 'ফ্যাকাশে হেপাটোপ্যানক্রিয়াস'], prevention: ['জৈব নিরাপত্তা', 'কোয়ারেন্টাইন'], treatment: ['প্রোবায়োটিক', 'ভিটামিন'] },
      { scientificName: 'Shell Disease', locale: 'bn', symptoms: ['খোলসে বাদামী/কালো দাগ', 'খোলসের ক্ষয়'], prevention: ['ভালো পানির গুণমান', 'আঘাত এড়িয়ে চলুন'], treatment: ['চুন প্রয়োগ', 'পানির গুণমান উন্নত করুন'] },
      { scientificName: 'Taura Syndrome Virus', locale: 'bn', symptoms: ['কিউটিকুলার এপিথেলিয়াম ক্ষত', 'লাল লেজ'], prevention: ['SPF মজুদ', 'জৈব নিরাপত্তা'], treatment: ['কোনো নিরাময় নেই', 'অপসারণ'] },
      { scientificName: 'Yellow Head Virus', locale: 'bn', symptoms: ['হলুদ মাথা', 'কম খাদ্য গ্রহণ', 'মৃত্যুহার'], prevention: ['SPF মজুদ', 'স্ক্রিনিং'], treatment: ['কোনো নিরাময় নেই', 'অপসারণ'] },

      // ── Odia ───────────────────────────────────────────────────────────
      { scientificName: 'Acute Hepatopancreatic Necrosis Disease', locale: 'or', symptoms: ['ଖାଲି ପେଟ', 'ଫିକା ହେପାଟୋପ୍ୟାନକ୍ରିଆସ', 'ନରମ ଖୋଳ', 'ମନ୍ଥର ପହଁରିବା'], prevention: ['କ୍ୱାରାଣ୍ଟାଇନ', 'ଭଲ ଜଳ ଗୁଣବତ୍ତା', 'ଜୀବାଣୁନାଶ'], treatment: ['ପ୍ରୋବାୟୋଟିକ୍ସ', 'ଜଳ ବିନିମୟ', 'ଚୂନ ପ୍ରୟୋଗ'] },
      { scientificName: 'White Spot Syndrome Virus', locale: 'or', symptoms: ['ଖୋଳରେ ଧଳା ଅନ୍ତର୍ଭୁକ୍ତି', 'କମ୍ ଖାଦ୍ୟ ଗ୍ରହଣ', 'ମୃତ୍ୟୁ ହାର'], prevention: ['ଜୈବ ସୁରକ୍ଷା', 'ସ୍କ୍ରିନିଂ'], treatment: ['କୌଣସି ଚିକିତ୍ସା ନାହିଁ', 'ସଂକ୍ରମିତ ପୋଖରୀ ହଟାନ୍ତୁ'] },
      { scientificName: 'Enterocytozoon hepatopenaei', locale: 'or', symptoms: ['ବୃଦ୍ଧି ବିଳମ୍ବ', 'ଧଳା ମଳ ସିଣ୍ଡ୍ରୋମ', 'କମ୍ ଖାଦ୍ୟ ରୂପାନ୍ତର'], prevention: ['SPF ପୋଷ୍ଟ-ଲାର୍ଭା ବ୍ୟବହାର କରନ୍ତୁ', 'ଜୈବ ସୁରକ୍ଷା'], treatment: ['ପ୍ରଭାବଶାଳୀ ଚିକିତ୍ସା ନାହିଁ', 'ହଟାଇ ଜୀବାଣୁନାଶ କରନ୍ତୁ'] },
      { scientificName: 'Infectious Myonecrosis Virus', locale: 'or', symptoms: ['ମାଂସପେଶୀ ନେକ୍ରୋସିସ', 'ଧଳା ନେକ୍ରୋଟିକ୍ କ୍ଷତ', 'ଉଚ୍ଚ ମୃତ୍ୟୁ ହାର'], prevention: ['SPF ଷ୍ଟକ', 'ଜୈବ ସୁରକ୍ଷା'], treatment: ['କୌଣସି ଚିକିତ୍ସା ନାହିଁ', 'ହଟାନ୍ତୁ'] },
      { scientificName: 'Vibrio spp.', locale: 'or', symptoms: ['ଉଜ୍ଜ୍ୱଳତା', 'ନେକ୍ରୋଟିକ୍ କ୍ଷତ', 'ଲାଲ ରଙ୍ଗ ପରିବର୍ତ୍ତନ'], prevention: ['ପ୍ରୋବାୟୋଟିକ୍ସ', 'ଭଲ ଜଳ ଗୁଣବତ୍ତା'], treatment: ['ଆଣ୍ଟିବାୟୋଟିକ୍ସ', 'ପ୍ରୋବାୟୋଟିକ୍ସ', 'ଜଳ ବିନିମୟ'] },
      { scientificName: 'Various fungi/bacteria', locale: 'or', symptoms: ['କଳା ଫୁଲକା ତନ୍ତୁ', 'କମ୍ ଶ୍ୱାସକ୍ରିୟା'], prevention: ['ଭଲ ଜଳ ଗୁଣବତ୍ତା'], treatment: ['ଜଳ ବିନିମୟ', 'ଚୂନ'] },
      { scientificName: 'Running Mortality Syndrome', locale: 'or', symptoms: ['କ୍ରମାଗତ ମୃତ୍ୟୁ ହାର', 'ନରମ ଖୋଳ', 'ଫିକା ହେପାଟୋପ୍ୟାନକ୍ରିଆସ'], prevention: ['ଜୈବ ସୁରକ୍ଷା', 'କ୍ୱାରାଣ୍ଟାଇନ'], treatment: ['ପ୍ରୋବାୟୋଟିକ୍ସ', 'ଭିଟାମିନ୍'] },
      { scientificName: 'Shell Disease', locale: 'or', symptoms: ['ଖୋଳରେ ବାଦାମୀ/କଳା ଦାଗ', 'ଖୋଳ କ୍ଷୟ'], prevention: ['ଭଲ ଜଳ ଗୁଣବତ୍ତା', 'ଆଘାତ ଏଡ଼ାନ୍ତୁ'], treatment: ['ଚୂନ ପ୍ରୟୋଗ', 'ଜଳ ଗୁଣବତ୍ତା ଉନ୍ନତ କରନ୍ତୁ'] },
      { scientificName: 'Taura Syndrome Virus', locale: 'or', symptoms: ['କ୍ୟୁଟିକୁଲାର ଏପିଥେଲିୟମ କ୍ଷତ', 'ଲାଲ ଲାଞ୍ଜ'], prevention: ['SPF ଷ୍ଟକ', 'ଜୈବ ସୁରକ୍ଷା'], treatment: ['କୌଣସି ଚିକିତ୍ସା ନାହିଁ', 'ହଟାନ୍ତୁ'] },
      { scientificName: 'Yellow Head Virus', locale: 'or', symptoms: ['ହଳଦିଆ ମୁଣ୍ଡ', 'କମ୍ ଖାଦ୍ୟ ଗ୍ରହଣ', 'ମୃତ୍ୟୁ ହାର'], prevention: ['SPF ଷ୍ଟକ', 'ସ୍କ୍ରିନିଂ'], treatment: ['କୌଣସି ଚିକିତ୍ସା ନାହିଁ', 'ହଟାନ୍ତୁ'] },
    ];

    for (const t of translations) {
      await queryRunner.query(
        `
        INSERT INTO "disease_library_translations"
          ("disease_id", "locale", "symptoms", "prevention_measures", "treatment_recommendations")
        SELECT "id", $2, $3::text[], $4::text[], $5::text[]
        FROM "disease_library"
        WHERE "scientific_name" = $1
        ON CONFLICT DO NOTHING
        `,
        [t.scientificName, t.locale, t.symptoms, t.prevention, t.treatment],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "disease_library_translations"`);
  }
}
