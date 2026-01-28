import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
export declare class FarmsController {
    private readonly farmsService;
    constructor(farmsService: FarmsService);
    create(createFarmDto: CreateFarmDto, req: any): Promise<import("./farm.entity").Farm>;
    findAll(req: any): Promise<import("./farm.entity").Farm[]>;
    findOne(id: string, req: any): Promise<import("./farm.entity").Farm>;
    update(id: string, updateFarmDto: UpdateFarmDto, req: any): Promise<import("./farm.entity").Farm>;
    remove(id: string, req: any): Promise<import("typeorm").DeleteResult>;
}
