import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface R2BucketStats {
  objectCount: number;
  totalBytes: number;
}

const CACHE_MS = 10 * 60 * 1000;
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const BUCKET = 'upcheck-photos';

/**
 * Admin photo-quota management (item 3): the real R2 bucket size, read from
 * Cloudflare's GraphQL analytics API, to show next to the ledger's own
 * totals on the admin overview. `dimensions{datetime}` is REQUIRED in the
 * query below or Cloudflare errors "cannot order by datetime" — verified
 * working shape, don't simplify it away.
 *
 * Never fails the overview: missing env or a failed/malformed API call both
 * degrade to `null` (logged), same fail-safe rule as every other overview
 * number. The token is read once from CLOUDFLARE_ANALYTICS_TOKEN and never
 * logged or returned.
 *
 * ponytail: one in-memory cache slot, not per-process-shared (Redis). Good
 * enough for a dashboard staff hit a few times an hour; add a shared cache
 * if this ever needs to be consistent across multiple backend instances.
 */
@Injectable()
export class R2AnalyticsService {
  private readonly logger = new Logger(R2AnalyticsService.name);
  private readonly token: string | undefined;
  private readonly accountId: string | undefined;
  private cached: { at: number; stats: R2BucketStats } | null = null;

  constructor(config: ConfigService) {
    this.token = config.get<string>('CLOUDFLARE_ANALYTICS_TOKEN');
    this.accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID');
  }

  async bucketStats(): Promise<R2BucketStats | null> {
    if (!this.token || !this.accountId) return null;
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.stats;

    try {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const query = `query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){r2StorageAdaptiveGroups(limit:1,filter:{datetime_geq:$s,datetime_leq:$e,bucketName:"${BUCKET}"},orderBy:[datetime_DESC]){max{objectCount payloadSize metadataSize} dimensions{datetime}}}}}`;
      const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
        body: JSON.stringify({
          query,
          variables: { a: this.accountId, s: start.toISOString(), e: now.toISOString() },
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Cloudflare GraphQL analytics returned ${res.status} — omitting R2 bucket size.`);
        return null;
      }
      const body = await res.json();
      if (body.errors?.length) {
        this.logger.warn(`Cloudflare GraphQL analytics errored — omitting R2 bucket size.`);
        return null;
      }
      const group = body?.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups?.[0];
      const max = group?.max;
      if (!max) return null;
      const stats: R2BucketStats = {
        objectCount: Number(max.objectCount ?? 0),
        totalBytes: Number(max.payloadSize ?? 0) + Number(max.metadataSize ?? 0),
      };
      this.cached = { at: Date.now(), stats };
      return stats;
    } catch (err: any) {
      this.logger.warn(`Could not reach Cloudflare GraphQL analytics: ${err?.message ?? err}`);
      return null;
    }
  }
}
