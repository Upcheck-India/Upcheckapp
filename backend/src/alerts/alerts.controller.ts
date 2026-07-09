import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@CurrentUser() user, @Body() createDto: CreateAlertDto) {
    // Force ownership to the authenticated caller; never trust a userId in the body.
    return this.alertsService.create({ ...createDto, userId: user.id });
  }

  @Get('me')
  findMine(@CurrentUser() user, @Query('unreadOnly') unreadOnly?: string) {
    return this.alertsService.findByUser(user.id, unreadOnly === 'true');
  }

  @Get('me/count')
  getMineUnreadCount(@CurrentUser() user) {
    return this.alertsService.getUnreadCount(user.id);
  }

  @Patch('me/read-all')
  markMineAllAsRead(@CurrentUser() user) {
    return this.alertsService.markAllAsRead(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.alertsService.findOneForUser(id, user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user) {
    return this.alertsService.markAsReadForUser(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.alertsService.removeForUser(id, user.id);
  }
}
