import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Measurement } from './measurement.entity';
import { DataDictionaryEntry } from './data-dictionary.entity';
import { Crop } from '../crops/crop.entity';
import { MeasurementService } from './measurement.service';
import { DataDictionaryService } from './data-dictionary.service';
import { MeasurementController } from './measurement.controller';
import { DataDictionaryController } from './data-dictionary.controller';
import { PondsModule } from '../ponds/ponds.module';

/**
 * The Measurement keystone module (PRD §6.2). `Crop` is registered here only to
 * read stocking dates for DOC derivation; it remains owned by CropsModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Measurement, DataDictionaryEntry, Crop]),
    PondsModule,
  ],
  controllers: [MeasurementController, DataDictionaryController],
  providers: [MeasurementService, DataDictionaryService],
  exports: [MeasurementService, DataDictionaryService],
})
export class MeasurementModule {}
