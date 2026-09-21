import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminDirectoryService } from './admin-directory.service';
import { SearchFarmsDto, SearchUsersDto } from './dto/search-users.dto';

/**
 * Staff-only (AdminKeyGuard, see its docs) read-only users/farms lookup.
 *
 * Subject ids are route params (`:id`) rather than a body or a bare list, so
 * C5.1's admin-access-log interceptor can name who was looked up — see the
 * doc comment on AdminDirectoryService.
 */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin')
export class AdminDirectoryController {
  constructor(private readonly directory: AdminDirectoryService) {}

  @Get('users')
  searchUsers(@Query() query: SearchUsersDto) {
    return this.directory.searchUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.directory.getUser(id);
  }

  @Get('farms')
  searchFarms(@Query() query: SearchFarmsDto) {
    return this.directory.searchFarms(query);
  }

  @Get('farms/:id')
  getFarm(@Param('id', ParseUUIDPipe) id: string) {
    return this.directory.getFarm(id);
  }
}
