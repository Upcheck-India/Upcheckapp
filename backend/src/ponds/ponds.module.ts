import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PondsService } from './ponds.service';
import { PondsController } from './ponds.controller';
import { Pond } from './pond.entity';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pond]), FarmsModule],
  controllers: [PondsController],
  providers: [PondsService],
  exports: [PondsService],
})
export class PondsModule { }
