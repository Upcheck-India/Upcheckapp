import { Repository } from 'typeorm';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { PondsService } from '../ponds/ponds.service';
export declare class WaterQualityService {
    private recordsRepository;
    private pondsService;
    constructor(recordsRepository: Repository<WaterQualityRecord>, pondsService: PondsService);
    create(createDto: CreateWaterQualityRecordDto, userId: string): Promise<WaterQualityRecord>;
    findAll(pondId: string, userId: string): Promise<WaterQualityRecord[]>;
    findByPond(pondId: string, userId: string, startDate?: Date, endDate?: Date): Promise<WaterQualityRecord[]>;
    findOne(id: string, userId: string): Promise<WaterQualityRecord>;
    update(id: string, updateDto: UpdateWaterQualityRecordDto, userId: string): Promise<WaterQualityRecord>;
    remove(id: string, userId: string): Promise<import("typeorm").DeleteResult>;
    getLatestByPond(pondId: string, userId: string): Promise<WaterQualityRecord | null>;
}
