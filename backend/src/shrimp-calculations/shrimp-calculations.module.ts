import { Module } from '@nestjs/common';
import { ShrimpCalculationsService } from './shrimp-calculations.service';
import { ShrimpCalculationsController } from './shrimp-calculations.controller';

@Module({
  providers: [ShrimpCalculationsService],
  controllers: [ShrimpCalculationsController]
})
export class ShrimpCalculationsModule {}
