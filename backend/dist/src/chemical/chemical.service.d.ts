import { Repository } from 'typeorm';
import { ChemicalData } from './chemical-data.entity';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';
export declare class ChemicalService {
    private chemicalRepository;
    constructor(chemicalRepository: Repository<ChemicalData>);
    create(dto: CreateChemicalDataDto): Promise<ChemicalData>;
    findByCrop(cropId: string): Promise<ChemicalData[]>;
    findOne(id: string): Promise<ChemicalData>;
}
