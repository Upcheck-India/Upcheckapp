import { WaterQualityService } from './water-quality.service';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
export declare class WaterQualityController {
    private readonly waterQualityService;
    constructor(waterQualityService: WaterQualityService);
    create(createDto: CreateWaterQualityRecordDto, req: any): Promise<import("./water-quality-record.entity").WaterQualityRecord>;
    findAll(pondId: string, req: any): Promise<import("./water-quality-record.entity").WaterQualityRecord[]>;
    getLatest(pondId: string, req: any): Promise<import("./water-quality-record.entity").WaterQualityRecord | null>;
    findOne(id: string, req: any): Promise<import("./water-quality-record.entity").WaterQualityRecord>;
    update(id: string, updateDto: UpdateWaterQualityRecordDto, req: any): Promise<import("./water-quality-record.entity").WaterQualityRecord>;
    remove(id: string, req: any): Promise<import("typeorm").DeleteResult>;
}
