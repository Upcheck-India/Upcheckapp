/**
 * Push text for a banned-substance escalation (D3.2), in the RECIPIENT's
 * language. A push is rendered by the OS, so its text has to be final on the
 * server; the alert-center row carries i18n keys + params instead (the app's
 * `compliance.alert.*` keys), so it re-renders on a language switch.
 * Native review pending, same as the ingredient names.
 */
export const COMPLIANCE_PUSH: Record<
  string,
  { title: string; body: string }
> = {
  en: {
    title: 'Banned substance logged',
    body: '{pond}: {substances} logged by {name} on {date}. Banned in shrimp farming; export lots are tested for it.',
  },
  hi: {
    title: 'प्रतिबंधित पदार्थ दर्ज हुआ',
    body: '{pond}: {name} ने {date} को {substances} दर्ज किया। झींगा पालन में यह प्रतिबंधित है; निर्यात खेप में इसकी जाँच होती है।',
  },
  te: {
    title: 'నిషేధిత పదార్థం నమోదైంది',
    body: '{pond}: {date}న {name} {substances} నమోదు చేశారు. రొయ్యల సాగులో ఇది నిషేధితం; ఎగుమతి సరుకులో దీనిని పరీక్షిస్తారు.',
  },
  ta: {
    title: 'தடைசெய்யப்பட்ட பொருள் பதிவானது',
    body: '{pond}: {date} அன்று {name} {substances} பதிவு செய்தார். இறால் வளர்ப்பில் இது தடைசெய்யப்பட்டது; ஏற்றுமதி சரக்குகளில் இது சோதிக்கப்படும்.',
  },
  bn: {
    title: 'নিষিদ্ধ পদার্থ লগ করা হয়েছে',
    body: '{pond}: {date} তারিখে {name} {substances} লগ করেছেন। চিংড়ি চাষে এটি নিষিদ্ধ; রপ্তানির চালানে এটি পরীক্ষা করা হয়।',
  },
  or: {
    title: 'ନିଷିଦ୍ଧ ପଦାର୍ଥ ଲଗ୍ ହେଲା',
    body: '{pond}: {date} ରେ {name} {substances} ଲଗ୍ କଲେ। ଚିଙ୍ଗୁଡ଼ି ଚାଷରେ ଏହା ନିଷିଦ୍ଧ; ରପ୍ତାନି ଚାଲାଣରେ ଏହାର ପରୀକ୍ଷା ହୁଏ।',
  },
};

/** English alert text persisted beside the keys (older app bundles show it). */
export const COMPLIANCE_ALERT_EN = {
  bannedTitle: '{pond}: banned substance logged',
  bannedBody: COMPLIANCE_PUSH.en.body,
  restrictedTitle: '{pond}: restricted substance logged',
  restrictedBody:
    '{pond}: {substances} logged by {name} on {date}. Confirm the withdrawal period with your processor before harvest.',
};

export const fill = (tpl: string, params: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
