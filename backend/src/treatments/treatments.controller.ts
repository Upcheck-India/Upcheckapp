import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { Public } from '../auth/decorators/auth.decorators';
import { BANNED_LIST_VERSION } from '../banned-substances/banned-substances.data';
import {
  DOSE_UNITS,
  INGREDIENTS,
  INGREDIENTS_VERSION,
  INGREDIENT_CATEGORIES,
  TREATMENT_REASONS,
} from './ingredients.data';

@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Post()
  @UseGuards(OwnershipGuard)
  @OwnsResource('Crop', 'cropId', 'pond.farm.userId', 'WRITE_MANAGEMENT')
  create(@Body() createDto: CreateTreatmentDto, @CurrentUser() user) {
    return this.treatmentsService.create(createDto, user.id);
  }

  @Get()
  findAll(@Query('cropId') cropId: string, @CurrentUser() user) {
    return this.treatmentsService.findAll(user.id, cropId);
  }

  /**
   * The ingredient catalogue (D2). Public reference data, not tenant data —
   * the app caches it offline. Declared before `:id` so it is not an id.
   */
  @Public()
  @Get('ingredients')
  ingredients() {
    return {
      version: INGREDIENTS_VERSION,
      bannedListVersion: BANNED_LIST_VERSION,
      categories: INGREDIENT_CATEGORIES,
      reasons: TREATMENT_REASONS,
      doseUnits: DOSE_UNITS,
      ingredients: INGREDIENTS,
    };
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId', 'READ')
  findOne(@Param('id') id: string) {
    return this.treatmentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId', 'WRITE_MANAGEMENT')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTreatmentDto,
    @CurrentUser() user,
  ) {
    return this.treatmentsService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @OwnsResource('Treatment', 'id', 'crop.pond.farm.userId', 'WRITE_MANAGEMENT')
  remove(@Param('id') id: string) {
    return this.treatmentsService.remove(id);
  }
}
