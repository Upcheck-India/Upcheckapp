import { Repository } from 'typeorm';
import { MicrobiologyData } from './microbiology-data.entity';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';
export declare class MicrobiologyService {
    private microbiologyRepository;
    constructor(microbiologyRepository: Repository<MicrobiologyData>);
    create(dto: CreateMicrobiologyDataDto): Promise<MicrobiologyData>;
    findByCrop(cropId: string): Promise<MicrobiologyData[]>;
}
