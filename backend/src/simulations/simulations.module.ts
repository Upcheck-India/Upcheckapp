import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crop } from '../crops/crop.entity';
import { FeedRecord } from '../feed-records/feed-record.entity';
import { Pond } from '../ponds/pond.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Simulation } from './simulation.entity';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Simulation, Crop, FeedRecord, Transaction, Pond]),
  ],
  controllers: [SimulationsController],
  providers: [SimulationsService],
  exports: [SimulationsService],
})
export class SimulationsModule {}
