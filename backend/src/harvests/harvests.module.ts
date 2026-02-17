import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HarvestsService } from './harvests.service';
import { HarvestsController } from './harvests.controller';
import { HarvestRecord } from './harvest-record.entity';

@Module({
    imports: [TypeOrmModule.forFeature([HarvestRecord])],
    controllers: [HarvestsController],
    providers: [HarvestsService],
    exports: [HarvestsService],
})
export class HarvestsModule { }
