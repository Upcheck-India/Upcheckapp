import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceService } from './reference.service';
import { ReferenceController } from './reference.controller';
import { Hatchery } from './entities/hatchery.entity';
import { Species } from './entities/species.entity';
import { Broodstock } from './entities/broodstock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hatchery, Species, Broodstock])],
  providers: [ReferenceService],
  controllers: [ReferenceController],
  exports: [TypeOrmModule],
})
export class ReferenceModule {}
