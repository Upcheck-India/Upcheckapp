import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertCenterService } from './alert-center.service';
import { EngineAlertService } from './engine-alert.service';
import { AlertCenterController } from './alert-center.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { Pond } from '../ponds/pond.entity';
import { PondContextModule } from '../pond-context/pond-context.module';
import { LunarModule } from '../lunar/lunar.module';

/**
 * Unified Alert Center on top of the existing AlertsService — every engine
 * emits here, the morning briefing summarizes each pond's top action, and the
 * live briefing recomputes engine alerts from the latest logged data.
 */
@Module({
  imports: [
    AlertsModule,
    TypeOrmModule.forFeature([Pond]),
    PondContextModule,
    LunarModule,
  ],
  controllers: [AlertCenterController],
  providers: [AlertCenterService, EngineAlertService],
  exports: [AlertCenterService, EngineAlertService],
})
export class AlertCenterModule {}
