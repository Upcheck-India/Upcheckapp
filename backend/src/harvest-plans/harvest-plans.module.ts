import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestPlan } from './harvest-plan.entity';
import { HarvestPlansController } from './harvest-plans.controller';
import { HarvestPlansService } from './harvest-plans.service';
import { Crop } from '../crops/crop.entity';
import { HarvestsModule } from '../harvests/harvests.module';

@Module({
  imports: [TypeOrmModule.forFeature([HarvestPlan, Crop]), HarvestsModule],
  controllers: [HarvestPlansController],
  providers: [HarvestPlansService],
  exports: [HarvestPlansService],
})
export class HarvestPlansModule {}
