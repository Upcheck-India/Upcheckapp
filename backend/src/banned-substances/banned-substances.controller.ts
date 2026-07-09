import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import {
  BANNED_SUBSTANCES,
  BANNED_LIST_VERSION,
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
    return { version: BANNED_LIST_VERSION, substances: BANNED_SUBSTANCES };
  }
}
