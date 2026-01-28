import { CropsService } from './crops.service';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
export declare class CropsController {
    private readonly cropsService;
    constructor(cropsService: CropsService);
    create(createCropDto: CreateCropDto, req: any): Promise<import("./crop.entity").Crop>;
    findAll(pondId: string, req: any): Promise<import("./crop.entity").Crop[]>;
    findOne(id: string, req: any): Promise<import("./crop.entity").Crop>;
    update(id: string, updateCropDto: UpdateCropDto, req: any): Promise<import("./crop.entity").Crop>;
    harvest(id: string, harvestData: {
        actualHarvestDate: Date;
        harvestWeightKg: number;
    }, req: any): Promise<import("./crop.entity").Crop>;
    remove(id: string, req: any): Promise<import("typeorm").DeleteResult>;
}
