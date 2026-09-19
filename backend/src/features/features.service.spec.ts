import { readFileSync } from 'fs';
import { join } from 'path';

const mockGetAll = jest.fn();
const mockShutdown = jest.fn();
const mockCtor = jest.fn();
jest.mock('posthog-node', () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      mockCtor(...args);
    }
    getAllFlagsAndPayloads = mockGetAll;
    shutdown = mockShutdown;
    capture = () => {
      throw new Error('capture must never be called');
    };
  },
}));

import { FeaturesService, hashUserId, highestRole } from './features.service';

const USER = '11111111-2222-3333-4444-555555555555';

function make(opts: {
  env?: Record<string, string>;
  roles?: string[];
  owned?: number;
  language?: string | null;
}) {
  const env = opts.env ?? {
    POSTHOG_PROJECT_TOKEN: 'phc_x',
    POSTHOG_FEATURE_FLAGS_KEY: 'phs_x',
  };
  const config = { get: (k: string) => env[k] };
  const members = {
    find: jest
      .fn()
      .mockResolvedValue((opts.roles ?? []).map((role) => ({ role }))),
  };
  const farms = { count: jest.fn().mockResolvedValue(opts.owned ?? 0) };
  const profiles = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        opts.language === null ? null : { languagePreference: opts.language ?? 'ta' },
      ),
  };
  return new FeaturesService(
    config as any,
    members as any,
    farms as any,
    profiles as any,
  );
}

describe('FeaturesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unconfigured → empty flags, no client constructed', async () => {
    const svc = make({ env: {} });
    await expect(svc.forUser(USER)).resolves.toEqual({ flags: {}, payloads: {} });
    expect(mockCtor).not.toHaveBeenCalled();
  });

  it('configures local evaluation without geoip', () => {
    make({});
    expect(mockCtor).toHaveBeenCalledWith('phc_x', {
      secretKey: 'phs_x',
      featureFlagsPollingInterval: 60000,
      disableGeoip: true,
    });
  });

  it('returns only app- keys, evaluates locally with hashed id + person props', async () => {
    mockGetAll.mockResolvedValue({
      featureFlags: {
        'app-news': false,
        'app-shop': true,
        'app-tasks': false,
        'other-flag': true,
      },
      featureFlagPayloads: { 'app-shop': { url: 'x' }, 'other-flag': 'secret' },
    });
    const svc = make({ roles: ['worker', 'manager'], language: 'ta' });
    await expect(svc.forUser(USER)).resolves.toEqual({
      flags: { 'app-news': false, 'app-shop': true, 'app-tasks': false },
      payloads: { 'app-shop': { url: 'x' } },
    });
    expect(mockGetAll).toHaveBeenCalledWith('efcaf6cdd2432f27', {
      personProperties: { role: 'manager', language: 'ta' },
      onlyEvaluateLocally: true,
    });
  });

  it('legacy farm owner (no membership row) ranks as owner', async () => {
    mockGetAll.mockResolvedValue({});
    await make({ roles: ['viewer'], owned: 1, language: null }).forUser(USER);
    expect(mockGetAll.mock.calls[0][1].personProperties).toEqual({ role: 'owner' });
  });

  it('evaluation error → empty, never throws', async () => {
    mockGetAll.mockRejectedValue(new Error('boom'));
    await expect(make({}).forUser(USER)).resolves.toEqual({ flags: {}, payloads: {} });
  });

  it('shuts the client down on module destroy', async () => {
    await make({}).onModuleDestroy();
    expect(mockShutdown).toHaveBeenCalled();
  });

  it('ranks roles owner > manager > worker > viewer', () => {
    expect(highestRole(['viewer', 'worker'])).toBe('worker');
    expect(highestRole(['manager', 'owner', 'viewer'])).toBe('owner');
    expect(highestRole([])).toBeNull();
  });

  it('distinctId hash matches the fixed vector and the frontend algorithm', () => {
    // Vector computed with node crypto: sha256('upcheck:' + USER) hex, first 16.
    expect(hashUserId(USER)).toBe('efcaf6cdd2432f27');
    const fe = readFileSync(
      join(__dirname, '../../../frontend/src/utils/hashUserId.ts'),
      'utf8',
    );
    expect(fe).toMatch(/const SALT = 'upcheck:';/);
    expect(fe).toMatch(/const LENGTH = 16;/);
    expect(fe).toMatch(/CryptoDigestAlgorithm\.SHA256/);
    expect(fe).toMatch(/`\$\{SALT\}\$\{rawId\}`/);
  });
});
