import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() user) {
    return this.leaveRequestsService.create(user.id, dto);
  }

  @Get('mine')
  mine(@Query('farmId') farmId: string, @CurrentUser() user) {
    if (!farmId) {
      throw new BadRequestException('farmId query parameter is required');
    }
    return this.leaveRequestsService.findMine(user.id, farmId);
  }

  @Get()
  findAll(
    @Query('farmId') farmId: string,
    @Query('status') status: string,
    @CurrentUser() user,
  ) {
    if (!farmId) {
      throw new BadRequestException('farmId query parameter is required');
    }
    return this.leaveRequestsService.findAllForFarm(user.id, farmId, status);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user) {
    return this.leaveRequestsService.decide(user.id, id, 'approved');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user) {
    return this.leaveRequestsService.decide(user.id, id, 'rejected');
  }
}
