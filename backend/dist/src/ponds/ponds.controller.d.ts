import { PondsService } from './ponds.service';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
export declare class PondsController {
    private readonly pondsService;
    constructor(pondsService: PondsService);
    create(createPondDto: CreatePondDto, req: any): Promise<import("./pond.entity").Pond>;
    findAll(farmId: string, req: any): Promise<import("./pond.entity").Pond[]>;
    findOne(id: string, req: any): Promise<import("./pond.entity").Pond>;
    update(id: string, updatePondDto: UpdatePondDto, req: any): Promise<import("./pond.entity").Pond>;
    remove(id: string, req: any): Promise<import("typeorm").DeleteResult>;
}
