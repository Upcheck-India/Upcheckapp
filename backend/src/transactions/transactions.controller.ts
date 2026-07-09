import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() user, @Body() createDto: CreateTransactionDto) {
    return this.transactionsService.create(createDto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user,
    @Query('farmId') farmId?: string,
    @Query('type') type?: string,
  ) {
    return this.transactionsService.findAll(user.id, farmId, type);
  }

  @Get('farm/:farmId/summary')
  getSummary(@CurrentUser() user, @Param('farmId') farmId: string) {
    return this.transactionsService.getSummaryByFarm(farmId, user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user,
    @Param('id') id: string,
    @Body() updateDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user, @Param('id') id: string) {
    return this.transactionsService.remove(id, user.id);
  }
}
