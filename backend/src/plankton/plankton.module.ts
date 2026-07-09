import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanktonController } from './plankton.controller';
import { PlanktonData } from './plankton-data.entity';
import { PlanktonService } from './plankton.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanktonData])],
  controllers: [PlanktonController],
  providers: [PlanktonService],
})
export class PlanktonModule {}
