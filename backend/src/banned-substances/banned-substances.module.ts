import { Module } from '@nestjs/common';
import { BannedSubstancesController } from './banned-substances.controller';

@Module({
  controllers: [BannedSubstancesController],
})
export class BannedSubstancesModule {}
