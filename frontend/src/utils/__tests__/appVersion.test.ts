jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '14' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.0' } } }));

import { appBuild, appVersion } from '../appVersion';

describe('appVersion', () => {
    it("prefers the running update's config version over the binary's frozen versionName", () => {
        expect(appVersion()).toBe('3.0.0');
    });

    it('keeps the build number native', () => {
        expect(appBuild()).toBe('14');
    });
});
