import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
@Controller('expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    create(@Body() createDto: CreateExpenseDto, @CurrentUser() user) {
        return this.expensesService.create(createDto, user.id);
    }

    @Get('cycle/:cropId')
    findByCycle(@Param('cropId') cropId: string, @CurrentUser() user) {
        return this.expensesService.findByCycle(cropId, user.id);
    }

    @Get('cycle/:cropId/financials')
    getCycleFinancials(@Param('cropId') cropId: string, @CurrentUser() user) {
        return this.expensesService.getCycleFinancials(cropId, user.id);
    }
}
