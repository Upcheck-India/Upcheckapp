import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import {
  BANNED_SUBSTANCES,
  BANNED_LIST_VERSION,
  BANNED_LIST_REVIEWED_BY,
  BANNED_LIST_REVIEWED_ON,
} from './banned-substances.data';

/**
 * Public read-only endpoint for the authoritative banned-substance list. The
 * client hydrates from it and caches it offline (BANNED-1). Public because the
 * list is regulatory reference data, not tenant data.
 */
@Controller('banned-substances')
export class BannedSubstancesController {
  @Public()
  @Get()
  list() {
    // Additive only: old app builds read `version` and each substance's
    // `name` / `aliases: string[]` / `category` / `note`, and ignore the rest.
    return {
      version: BANNED_LIST_VERSION,
      reviewedOn: BANNED_LIST_REVIEWED_ON,
      reviewedBy: BANNED_LIST_REVIEWED_BY || null,
      substances: BANNED_SUBSTANCES,
    };
  }
}
