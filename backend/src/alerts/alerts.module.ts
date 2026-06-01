import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Alert } from './alert.entity';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alert]), PushModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule { }
