import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PondsModule } from '../ponds/ponds.module';
import { CropsModule } from '../crops/crops.module';
import { FeedRecordsModule } from '../feed-records/feed-records.module';
import { HarvestsModule } from '../harvests/harvests.module';
import { FinancesModule } from '../finances/finances.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [
        PondsModule,
        CropsModule,
        FeedRecordsModule,
        HarvestsModule,
        FinancesModule,
        InventoryModule
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
