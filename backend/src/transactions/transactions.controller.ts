import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    create(@Body() createDto: CreateTransactionDto) {
        return this.transactionsService.create(createDto);
    }

    @Get()
    findAll(@Query('farmId') farmId?: string, @Query('type') type?: string) {
        return this.transactionsService.findAll(farmId, type);
    }

    @Get('farm/:farmId/summary')
    getSummary(@Param('farmId') farmId: string) {
        return this.transactionsService.getSummaryByFarm(farmId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateTransactionDto) {
        return this.transactionsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.transactionsService.remove(id);
    }
}
