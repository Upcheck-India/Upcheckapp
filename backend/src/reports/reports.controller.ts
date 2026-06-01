import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    async getDashboardSummary(@CurrentUser() user, @Query('farmId') farmId?: string) {
        return this.reportsService.getDashboardSummary(user.id, farmId);
    }

    @Get('cycle/:id/analysis')
    async getCycleAnalysis(@CurrentUser() user, @Param('id') id: string) {
        return this.reportsService.getCycleAnalysis(id, user.id);
    }

    @Get('financials')
    async getFinancialReport(@Query('farmId') farmId: string, @CurrentUser() user) {
        return this.reportsService.getFinancialReport(farmId, user.id);
    }
}
