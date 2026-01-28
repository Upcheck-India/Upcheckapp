import { Repository } from 'typeorm';
import { PlanktonData } from './plankton-data.entity';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';
export declare class PlanktonService {
    private planktonRepository;
    constructor(planktonRepository: Repository<PlanktonData>);
    create(dto: CreatePlanktonDataDto): Promise<PlanktonData>;
    findByCrop(cropId: string): Promise<PlanktonData[]>;
}
