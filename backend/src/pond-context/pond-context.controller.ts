import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PondContextService } from './pond-context.service';

/**
 * Latest-input snapshot for a pond — engines prefill from this instead of
 * re-asking the farmer for data already logged (PRD "capture once, reuse").
 */
@Controller('pond-context')
export class PondContextController {
  constructor(private readonly service: PondContextService) {}

  @Get(':pondId')
  get(@Param('pondId') pondId: string, @CurrentUser() user) {
    return this.service.getContext(pondId, user.id);
  }
}
