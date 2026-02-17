import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryItem } from './inventory-item.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { FarmsModule } from '../farms/farms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryItem]),
    AlertsModule,
    FarmsModule
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule { }
