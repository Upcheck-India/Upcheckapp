import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MortalityController } from './mortality.controller';
import { MortalityRecord } from './mortality-record.entity';
import { MortalityService } from './mortality.service';

@Module({
    imports: [TypeOrmModule.forFeature([MortalityRecord])],
    controllers: [MortalityController],
    providers: [MortalityService],
})
export class MortalityModule { }
