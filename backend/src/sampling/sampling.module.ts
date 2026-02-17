import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplingService } from './sampling.service';
import { SamplingController } from './sampling.controller';
import { SamplingData } from './sampling-data.entity';

import { PondsModule } from '../ponds/ponds.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SamplingData]),
        PondsModule,
    ],
    controllers: [SamplingController],
    providers: [SamplingService],
    exports: [SamplingService],
})
export class SamplingModule { }
