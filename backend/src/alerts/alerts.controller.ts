import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Post()
    create(@Body() createDto: CreateAlertDto) {
        return this.alertsService.create(createDto);
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

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string, @Query('unreadOnly') unreadOnly?: string) {
        return this.alertsService.findByUser(userId, unreadOnly === 'true');
    }

    @Get('user/:userId/count')
    getUnreadCount(@Param('userId') userId: string) {
        return this.alertsService.getUnreadCount(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user) {
        return this.alertsService.findOneForUser(id, user.id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @CurrentUser() user) {
        return this.alertsService.markAsRead(id);
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId') userId: string) {
        return this.alertsService.markAllAsRead(userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user) {
        return this.alertsService.removeForUser(id, user.id);
    }
}
