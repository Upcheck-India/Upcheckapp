import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Post()
  create(@Body() createFarmDto: CreateFarmDto, @CurrentUser() user) {
    // A worker account creating a farm becomes that farm's owner (farm.userId
    // is whoever created it) — there was no server-side check at all, only a
    // client-side UX assumption that workers wouldn't reach this screen. Any
    // worker who did (directly or via a client bug) genuinely became an
    // "owner" of a real farm row, which is exactly the reported bug.
    if (user.accountType === 'worker') {
      throw new ForbiddenException(
        'Worker accounts cannot create farms. Ask a farm owner to add you as a team member.',
      );
    }
    return this.farmsService.create(createFarmDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user) {
    return this.farmsService.findAll(user.id);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'id', 'userId', 'READ')
  findOne(@Param('id') id: string) {
    return this.farmsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'id', 'userId', 'OWNER_ONLY')
  update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto) {
    return this.farmsService.update(id, updateFarmDto);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Farm', 'id', 'userId', 'OWNER_ONLY')
  remove(@Param('id') id: string) {
    return this.farmsService.remove(id);
  }
}
