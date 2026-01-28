import { MortalityService } from './mortality.service';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
export declare class MortalityController {
    private readonly mortalityService;
    constructor(mortalityService: MortalityService);
    create(dto: CreateMortalityRecordDto): Promise<import("./mortality-record.entity").MortalityRecord>;
    findByCrop(cropId: string): Promise<import("./mortality-record.entity").MortalityRecord[]>;
}
