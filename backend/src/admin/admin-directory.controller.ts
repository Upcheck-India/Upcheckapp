import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminSubject } from '../admin-access-log/admin-subject.decorator';
import { AdminDirectoryService } from './admin-directory.service';
import { SearchFarmsDto, SearchUsersDto } from './dto/search-users.dto';

/**
 * Staff-only (AdminKeyGuard, see its docs) read-only users/farms lookup.
 *
 * Detail routes use `@AdminSubject()` (the `:id` param IS the subject).
 * Search routes have no route param, so the handler sets `req.adminSubject`
 * itself, using the MATCHED result id(s) — never the raw email/phone
 * searched, so a staffer's search terms (which can be a farmer's PII) never
 * land in admin_access_log. See admin-subject.decorator.ts.
 */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin')
export class AdminDirectoryController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get('users')
  async searchUsers(@Query() query: SearchUsersDto, @Req() req: Request) {
    const results = await this.directory.searchUsers(query);
    (req as any).adminSubject = {
      type: 'user',
      id: results.length ? results.map((u) => u.id).join(',') : 'none',
    };
    return results;
  }

  @Get('users/:id')
  @AdminSubject('user')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.directory.getUser(id);
  }

  @Get('farms')
  async searchFarms(@Query() query: SearchFarmsDto, @Req() req: Request) {
    const results = await this.directory.searchFarms(query);
    (req as any).adminSubject = {
      type: 'farm',
      id: results.length ? results.map((f) => f.id).join(',') : 'none',
    };
    return results;
  }

  @Get('farms/:id')
  @AdminSubject('farm')
  getFarm(@Param('id', ParseUUIDPipe) id: string) {
    return this.directory.getFarm(id);
  }
}
