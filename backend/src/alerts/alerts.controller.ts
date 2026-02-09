import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
    constructor(private readonly alertsService: AlertsService) { }

    @Post()
    create(@Body() createDto: CreateAlertDto) {
        return this.alertsService.create(createDto);
    }

    @Get('user/:userId')
    findByUser(@Param('userId') userId: string, @Query('unreadOnly') unreadOnly?: string) {
        return this.alertsService.findByUser(userId, unreadOnly === 'true');
    }

    @Get('user/:userId/count')
    getUnreadCount(@Param('userId') userId: string) {
        return this.alertsService.getUnreadCount(userId);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.alertsService.markAsRead(id);
    }

    @Patch('user/:userId/read-all')
    markAllAsRead(@Param('userId') userId: string) {
        return this.alertsService.markAllAsRead(userId);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.alertsService.remove(id);
    }
}
