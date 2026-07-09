import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PondsService } from './ponds.service';
import { PondsController } from './ponds.controller';
import { Pond } from './pond.entity';
import { PondDimensionHistory } from './pond-dimension-history.entity';
import { PondDimensionService } from './pond-dimension.service';
import { PondNamingService } from './pond-naming.service';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pond, PondDimensionHistory]),
    FarmsModule,
  ],
  controllers: [PondsController],
  providers: [PondsService, PondDimensionService, PondNamingService],
  exports: [PondsService],
})
export class PondsModule {}
