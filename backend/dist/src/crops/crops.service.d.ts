import { Repository } from 'typeorm';
import { Crop } from './crop.entity';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { PondsService } from '../ponds/ponds.service';
export declare class CropsService {
    private cropsRepository;
    private pondsService;
    constructor(cropsRepository: Repository<Crop>, pondsService: PondsService);
    create(createCropDto: CreateCropDto, userId: string): Promise<Crop>;
    findAll(pondId: string, userId: string): Promise<Crop[]>;
    findByPond(pondId: string, userId: string): Promise<Crop[]>;
    findOne(id: string, userId: string): Promise<Crop>;
    update(id: string, updateCropDto: UpdateCropDto, userId: string): Promise<Crop>;
    remove(id: string, userId: string): Promise<import("typeorm").DeleteResult>;
    harvest(id: string, harvestData: {
        actualHarvestDate: Date;
        harvestWeightKg: number;
    }, userId: string): Promise<Crop>;
}
