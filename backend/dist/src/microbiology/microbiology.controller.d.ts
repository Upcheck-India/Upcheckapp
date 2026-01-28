import { MicrobiologyService } from './microbiology.service';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';
export declare class MicrobiologyController {
    private readonly microbiologyService;
    constructor(microbiologyService: MicrobiologyService);
    create(dto: CreateMicrobiologyDataDto): Promise<import("./microbiology-data.entity").MicrobiologyData>;
    findByCrop(cropId: string): Promise<import("./microbiology-data.entity").MicrobiologyData[]>;
}
