import { Repository } from 'typeorm';
import { MortalityRecord } from './mortality-record.entity';
import { CreateMortalityRecordDto } from './dto/create-mortality-record.dto';
export declare class MortalityService {
    private mortalityRepository;
    constructor(mortalityRepository: Repository<MortalityRecord>);
    create(dto: CreateMortalityRecordDto): Promise<MortalityRecord>;
    findByCrop(cropId: string): Promise<MortalityRecord[]>;
}
