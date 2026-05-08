import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { PondsService } from '../ponds/ponds.service';
import { HarvestsService } from '../harvests/harvests.service';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Expense)
        private expensesRepository: Repository<Expense>,
        private pondsService: PondsService,
        private harvestsService: HarvestsService, // For P&L reports
    ) { }

    async create(createDto: CreateExpenseDto, userId: string) {
        // Validate expense amount is positive
        if (!createDto.amount || createDto.amount <= 0) {
            throw new BadRequestException('Expense amount must be positive');
        }

        // Verify ownership and get active cycle if not provided
        const pond = await this.pondsService.findOne(createDto.pondId, userId);

        const expense = this.expensesRepository.create({
            pondId: createDto.pondId,
            cropId: createDto.cropId || pond.activeCycleId, // Auto-link to active cycle if exists
            amount: createDto.amount,
            category: createDto.category,
            description: createDto.description,
            date: createDto.date,
            userId,
        });

        return this.expensesRepository.save(expense);
    }

    async findByCycle(cropId: string) {
        return this.expensesRepository.find({
            where: { cropId },
            order: { date: 'DESC' },
        });
    }

    async getCycleFinancials(cropId: string) {
        // 1. Get Expenses
        const expenses = await this.findByCycle(cropId);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Group expenses by category
        const expensesByCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
            return acc;
        }, {} as Record<string, number>);

        // 2. Get Revenue (Harvests)
        const harvests = await this.harvestsService.findAll(cropId);
        const totalRevenue = harvests.reduce((sum, h) => sum + (Number(h.salePriceTotal) || 0), 0);

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            marginPercent: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
            expensesByCategory
        };
    }
}
