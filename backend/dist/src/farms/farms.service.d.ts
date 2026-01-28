import { Repository } from 'typeorm';
import { Farm } from './farm.entity';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
export declare class FarmsService {
    private farmsRepository;
    constructor(farmsRepository: Repository<Farm>);
    create(createFarmDto: CreateFarmDto, userId: string): Promise<Farm>;
    findAll(userId: string): Promise<Farm[]>;
    findOne(id: string, userId: string): Promise<Farm>;
    update(id: string, updateFarmDto: UpdateFarmDto, userId: string): Promise<Farm>;
    remove(id: string, userId: string): Promise<import("typeorm").DeleteResult>;
}
