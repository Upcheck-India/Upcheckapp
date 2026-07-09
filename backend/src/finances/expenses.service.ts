import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { Crop } from '../crops/crop.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { HarvestsService } from '../harvests/harvests.service';
import { FarmAccessService } from '../farm-access/farm-access.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @InjectRepository(Crop)
    private cropsRepository: Repository<Crop>,
    private harvestsService: HarvestsService, // For P&L reports
    private readonly farmAccess: FarmAccessService,
  ) {}

  /** Resolve a crop to its pond and assert the caller may view financials. */
  private async assertCropFinancials(cropId: string, userId: string) {
    const crop = await this.cropsRepository.findOne({ where: { id: cropId } });
    if (!crop) {
      throw new NotFoundException(`Crop with ID ${cropId} not found`);
    }
    await this.farmAccess.assertCanAccessPond(
      userId,
      crop.pondId,
      'VIEW_FINANCIALS',
    );
  }

  async create(createDto: CreateExpenseDto, userId: string) {
    // Validate expense amount is positive
    if (!createDto.amount || createDto.amount <= 0) {
      throw new BadRequestException('Expense amount must be positive');
    }

    // Cost entry is owner/manager only (VIEW_FINANCIALS); returns the pond.
    const pond = await this.farmAccess.assertCanAccessPond(
      userId,
      createDto.pondId,
      'VIEW_FINANCIALS',
    );

    // If a cropId is supplied, it MUST belong to the same pond the caller was
    // just authorized for — otherwise a user could attach an expense to another
    // tenant's crop (their pondId + a victim's cropId), polluting that farm's
    // P&L/break-even. Access to the pond does not imply access to an arbitrary crop.
    if (createDto.cropId) {
      const crop = await this.cropsRepository.findOne({
        where: { id: createDto.cropId },
      });
      if (!crop || crop.pondId !== createDto.pondId) {
        throw new BadRequestException(
          'cropId does not belong to the specified pond',
        );
      }
    }

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

  async findByCycle(cropId: string, userId: string) {
    await this.assertCropFinancials(cropId, userId);
    return this.expensesRepository.find({
      where: { cropId },
      order: { date: 'DESC' },
    });
  }

  async getCycleFinancials(cropId: string, userId: string) {
    // 1. Get Expenses (also performs the VIEW_FINANCIALS authorization check)
    const expenses = await this.findByCycle(cropId, userId);
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    // Group expenses by category
    const expensesByCategory = expenses.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    // 2. Get Revenue + harvested biomass (Harvests). findAll is
    // (userId, cropId?) — the crop filter is the 2nd arg; passing cropId as the
    // userId scoped to no farms and silently returned zero revenue.
    const harvests = await this.harvestsService.findAll(userId, cropId);
    const totalRevenue = harvests.reduce(
      (sum, h) => sum + (Number(h.salePriceTotal) || 0),
      0,
    );
    const totalHarvestKg = harvests.reduce(
      (sum, h) => sum + (Number(h.weightKg) || 0),
      0,
    );

    // Break-even: the sale price per kg at which revenue would cover all costs
    // incurred so far (= cost per kg). Null until there is harvested weight.
    const breakEvenPricePerKg =
      totalHarvestKg > 0 ? totalExpenses / totalHarvestKg : null;

    // Round money to 2dp to avoid JS float drift (e.g. 12345.670000000002)
    // surfacing in API responses — matches pnl.service.ts.
    return {
      totalRevenue: round2(totalRevenue),
      totalExpenses: round2(totalExpenses),
      netProfit: round2(totalRevenue - totalExpenses),
      marginPercent:
        totalRevenue > 0
          ? round2(((totalRevenue - totalExpenses) / totalRevenue) * 100)
          : 0,
      totalHarvestKg: round2(totalHarvestKg),
      breakEvenPricePerKg:
        breakEvenPricePerKg === null ? null : round2(breakEvenPricePerKg),
      expensesByCategory,
    };
  }
}
