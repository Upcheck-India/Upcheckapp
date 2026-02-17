import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplingService } from './sampling.service';
import { SamplingController } from './sampling.controller';
import { SamplingData } from './sampling-data.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SamplingData])],
    controllers: [SamplingController],
    providers: [SamplingService],
    exports: [SamplingService],
})
export class SamplingModule { }
