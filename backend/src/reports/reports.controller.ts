import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    async getDashboardSummary(@Request() req, @Query('farmId') farmId?: string) {
        return this.reportsService.getDashboardSummary(req.user.id, farmId);
    }

    @Get('cycle/:id/analysis')
    async getCycleAnalysis(@Param('id') id: string) {
        return this.reportsService.getCycleAnalysis(id);
    }

    @Get('financials')
    async getFinancialReport(@Query('farmId') farmId: string) {
        return this.reportsService.getFinancialReport(farmId);
    }
}
