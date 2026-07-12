import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiseaseController } from './disease.controller';
import { DiseaseLibrary } from './disease-library.entity';
import { DiseaseLibraryTranslation } from './disease-library-translation.entity';
import { DiseaseRecord } from './disease-record.entity';
import { DiseaseService } from './disease.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiseaseLibrary,
      DiseaseLibraryTranslation,
      DiseaseRecord,
    ]),
  ],
  controllers: [DiseaseController],
  providers: [DiseaseService],
})
export class DiseaseModule {}
