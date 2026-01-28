import { ChemicalService } from './chemical.service';
import { CreateChemicalDataDto } from './dto/create-chemical-data.dto';
export declare class ChemicalController {
    private readonly chemicalService;
    constructor(chemicalService: ChemicalService);
    create(dto: CreateChemicalDataDto): Promise<import("./chemical-data.entity").ChemicalData>;
    findByCrop(cropId: string): Promise<import("./chemical-data.entity").ChemicalData[]>;
}
