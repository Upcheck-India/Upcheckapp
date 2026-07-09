import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestsService } from './harvests.service';
import { HarvestsController } from './harvests.controller';
import { Harvest } from './harvest.entity';
import { CropsModule } from '../crops/crops.module';

@Module({
  imports: [TypeOrmModule.forFeature([Harvest]), CropsModule],
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
