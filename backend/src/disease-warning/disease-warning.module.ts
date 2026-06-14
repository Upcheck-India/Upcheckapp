import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiseaseRiskSnapshot } from './disease-risk-snapshot.entity';
import { DiseaseWarningService } from './disease-warning.service';
import { DiseaseWarningController } from './disease-warning.controller';
import { PondsModule } from '../ponds/ponds.module';

/** Disease Early-Warning engine (farmer_features_spec.md §2). */
@Module({
  imports: [TypeOrmModule.forFeature([DiseaseRiskSnapshot]), PondsModule],
  controllers: [DiseaseWarningController],
  providers: [DiseaseWarningService],
  exports: [DiseaseWarningService],
})
export class DiseaseWarningModule {}
