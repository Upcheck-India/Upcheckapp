import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiseaseRiskSnapshot } from './disease-risk-snapshot.entity';
import { DiseaseWarningService } from './disease-warning.service';
import { DiseaseIndicatorsService } from './disease-indicators.service';
import { DiseaseWarningController } from './disease-warning.controller';
import { PondsModule } from '../ponds/ponds.module';
import { PondContextModule } from '../pond-context/pond-context.module';

/** Disease Early-Warning engine (farmer_features_spec.md §2, disease spec D7). */
@Module({
  imports: [TypeOrmModule.forFeature([DiseaseRiskSnapshot]), PondsModule, PondContextModule],
  controllers: [DiseaseWarningController],
  providers: [DiseaseWarningService, DiseaseIndicatorsService],
  exports: [DiseaseWarningService, DiseaseIndicatorsService],
})
export class DiseaseWarningModule {}
