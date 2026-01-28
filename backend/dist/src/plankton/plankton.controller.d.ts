import { PlanktonService } from './plankton.service';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';
export declare class PlanktonController {
    private readonly planktonService;
    constructor(planktonService: PlanktonService);
    create(dto: CreatePlanktonDataDto): Promise<import("./plankton-data.entity").PlanktonData>;
    findByCrop(cropId: string): Promise<import("./plankton-data.entity").PlanktonData[]>;
}
