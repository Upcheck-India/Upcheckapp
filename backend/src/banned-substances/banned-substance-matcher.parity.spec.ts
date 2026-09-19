import * as server from './banned-substance-matcher.core';
import { BANNED_SUBSTANCES as serverList } from './banned-substances.data';
// The app's generated copies (frontend `npm run gen:banned`). Both are
// dependency-free TypeScript, so the backend's jest can load them directly.
import * as app from '../../../frontend/src/features/bannedSubstanceMatcher.generated';
import { BANNED_SUBSTANCES as appList } from '../../../frontend/src/features/bannedSubstances.generated';

describe('banned-substance matcher parity: backend vs app (spec D1)', () => {
  const corpus = [
    'Applied Chloramphenicol 5ml',
    'sulphamethoxazole and enrofloxacine',
    'sem sample sent to lab',
    'आज क्लोरैम्फेनिकॉल डाला',
    'కొలిస్టిన్ వేశాం',
    'குளோரம்பெனிகால்',
    'ক্লোরামফেনিকল',
    'କୋଲିଷ୍ଟିନ',
    'nalidixic-acid',
    'probiotics and lime only',
    'Oxytetracycline before harvest',
  ];

  it.each(corpus)('same result for %p', (text) => {
    expect(app.normalizeForMatch(text)).toBe(server.normalizeForMatch(text));
    expect(app.matchSubstances(text, appList).map((s) => s.key)).toEqual(
      server.matchSubstances(text, serverList).map((s) => s.key),
    );
  });

  it('ships the same list', () => {
    expect(appList).toEqual(serverList);
  });
});
