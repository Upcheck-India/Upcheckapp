import { Controller, Get, Req } from '@nestjs/common';
import { FeaturesService } from './features.service';

/** `GET /features` — the caller's remote flags. Global JwtAuthGuard applies. */
@Controller('features')
export class FeaturesController {
  constructor(private readonly features: FeaturesService) {}

  @Get()
  get(@Req() req: any) {
    return this.features.forUser(req.user.id);
  }
}
