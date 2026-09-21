import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConsentsService } from './consents.service';
import { RecordConsentsDto } from './dto/record-consents.dto';

@Controller('consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  /** Batch append; idempotent per row id. The user is always the caller. */
  @Post()
  record(@CurrentUser() user, @Body() body: RecordConsentsDto) {
    return this.consents.record(user.id, body.consents);
  }

  @Get('me')
  mine(@CurrentUser() user) {
    return this.consents.latestForUser(user.id);
  }
}
