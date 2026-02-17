import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    create(@Body() createDto: CreateExpenseDto, @Req() req) {
        return this.expensesService.create(createDto, req.user.id);
    }

    @Get('cycle/:cropId')
    findByCycle(@Param('cropId') cropId: string) {
        return this.expensesService.findByCycle(cropId);
    }

    @Get('cycle/:cropId/financials')
    getCycleFinancials(@Param('cropId') cropId: string) {
        return this.expensesService.getCycleFinancials(cropId);
    }
}
