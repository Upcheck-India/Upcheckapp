import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PostHog } from 'posthog-node';
import { FarmMember, FarmRole } from '../farm-access/farm-member.entity';
import { Farm } from '../farms/farm.entity';
import { Profile } from '../profiles/profile.entity';

export interface FeatureFlagsResponse {
  flags: Record<string, string | boolean>;
  payloads: Record<string, unknown>;
}

/** Only flags with this prefix reach the app — the project holds other flags. */
const APP_PREFIX = 'app-';

const ROLE_RANK: Record<FarmRole, number> = {
  viewer: 1,
  worker: 2,
  manager: 3,
  owner: 4,
};

/**
 * MUST equal `frontend/src/utils/hashUserId.ts`: same salt, same length. A
 * PostHog person is then one string whether the flag was evaluated here or an
 * event was sent by a consented client.
 */
export const hashUserId = (userId: string): string =>
  createHash('sha256').update(`upcheck:${userId}`).digest('hex').slice(0, 16);

/** Highest role across memberships; null when the user has none. */
export function highestRole(roles: FarmRole[]): FarmRole | null {
  let best: FarmRole | null = null;
  for (const r of roles) {
    if (ROLE_RANK[r] && (!best || ROLE_RANK[r] > ROLE_RANK[best])) best = r;
  }
  return best;
}

/**
 * Remote feature flags, evaluated on the SERVER with local evaluation.
 *
 * Why here and not in the app: the app's PostHog client only exists after
 * analytics consent, and the Privacy Policy forbids sending anything without
 * it. `onlyEvaluateLocally: true` means the server evaluates against polled
 * flag definitions — no per-user request, and `capture` is never called, so
 * no events leave for anyone.
 */
@Injectable()
export class FeaturesService implements OnModuleDestroy {
  private readonly logger = new Logger(FeaturesService.name);
  private readonly client: PostHog | null;

  constructor(
    config: ConfigService,
    @InjectRepository(FarmMember)
    private readonly membersRepo: Repository<FarmMember>,
    @InjectRepository(Farm)
    private readonly farmsRepo: Repository<Farm>,
    @InjectRepository(Profile)
    private readonly profilesRepo: Repository<Profile>,
  ) {
    const token = config.get<string>('POSTHOG_PROJECT_TOKEN')?.trim();
    const key = config.get<string>('POSTHOG_FEATURE_FLAGS_KEY')?.trim();
    if (!token || !key) {
      this.logger.warn(
        'POSTHOG_PROJECT_TOKEN / POSTHOG_FEATURE_FLAGS_KEY not set — every remote flag uses the app default',
      );
      this.client = null;
      return;
    }
    this.client = new PostHog(token, {
      // `secretKey` is the non-deprecated name for `personalApiKey` in
      // posthog-node 5.x; it accepts a personal (phx_) or secure (phs_) key.
      secretKey: key,
      featureFlagsPollingInterval: 60000,
      disableGeoip: true,
    });
  }

  async forUser(userId: string): Promise<FeatureFlagsResponse> {
    const empty: FeatureFlagsResponse = { flags: {}, payloads: {} };
    if (!this.client) return empty;
    try {
      const [members, owned, profile] = await Promise.all([
        this.membersRepo.find({
          where: { userId, status: 'active' },
          select: { role: true },
        }),
        this.farmsRepo.count({ where: { userId, deletedAt: IsNull() } }),
        this.profilesRepo.findOne({
          where: { id: userId },
          select: { id: true, languagePreference: true },
        }),
      ]);
      const role = highestRole([
        ...members.map((m) => m.role),
        ...(owned > 0 ? (['owner'] as FarmRole[]) : []),
      ]);
      const personProperties: Record<string, string> = {};
      if (role) personProperties.role = role;
      if (profile?.languagePreference)
        personProperties.language = profile.languagePreference;

      const res = await this.client.getAllFlagsAndPayloads(hashUserId(userId), {
        personProperties,
        onlyEvaluateLocally: true,
      });
      const out: FeatureFlagsResponse = { flags: {}, payloads: {} };
      for (const [k, v] of Object.entries(res.featureFlags ?? {})) {
        if (k.startsWith(APP_PREFIX)) out.flags[k] = v;
      }
      for (const [k, v] of Object.entries(res.featureFlagPayloads ?? {})) {
        if (k.startsWith(APP_PREFIX)) out.payloads[k] = v;
      }
      return out;
    } catch (err) {
      // Flags are never worth a failed request: the app falls back to defaults.
      this.logger.warn(`feature flag evaluation failed: ${String(err)}`);
      return empty;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
