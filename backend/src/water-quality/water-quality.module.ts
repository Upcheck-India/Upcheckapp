import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaterQualityService } from './water-quality.service';
import { WaterQualityController } from './water-quality.controller';
import { WaterQualityRecord } from './water-quality-record.entity';
import { PondsModule } from '../ponds/ponds.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([WaterQualityRecord]), PondsModule, AlertsModule],
  controllers: [WaterQualityController],
  providers: [WaterQualityService],
  exports: [WaterQualityService],
})
export class WaterQualityModule { }
