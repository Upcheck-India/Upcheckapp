import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoltAction } from './molt-action.entity';
import { Pond } from '../ponds/pond.entity';
import { MoltService } from './molt.service';
import { MoltController } from './molt.controller';

/** Molt window + per-pond checklist (spec 2026-09-14 §1). */
@Module({
  imports: [TypeOrmModule.forFeature([MoltAction, Pond])],
  controllers: [MoltController],
  providers: [MoltService],
  exports: [MoltService],
})
export class MoltModule {}
