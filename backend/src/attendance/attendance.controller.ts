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
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Post(':id/check-out')
  checkOut(
    @Param('id') id: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() user,
  ) {
    return this.attendanceService.checkOut(user.id, id, dto);
  }

  @Get('mine')
  mine(
    @Query('farmId') farmId: string,
    @Query('date') date: string,
    @CurrentUser() user,
  ) {
    if (!farmId) {
      throw new BadRequestException('farmId query parameter is required');
    }
    return this.attendanceService.findMine(user.id, farmId, date);
  }

  @Get()
  findAll(
    @Query('farmId') farmId: string,
    @Query('date') date: string,
    @CurrentUser() user,
  ) {
    if (!farmId) {
      throw new BadRequestException('farmId query parameter is required');
    }
    return this.attendanceService.findAllForFarm(user.id, farmId, date);
  }
}
