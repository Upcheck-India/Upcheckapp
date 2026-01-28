import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChemicalController } from './chemical.controller';
import { ChemicalData } from './chemical-data.entity';
import { ChemicalService } from './chemical.service';

@Module({
    imports: [TypeOrmModule.forFeature([ChemicalData])],
    controllers: [ChemicalController],
    providers: [ChemicalService],
})
export class ChemicalModule { }
