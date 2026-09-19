import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { PushModule } from '../push/push.module';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

/** Banned-substance escalation + cycle compliance (disease spec D3). */
@Module({
  imports: [AlertsModule, PushModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
