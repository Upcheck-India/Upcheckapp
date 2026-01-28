import { Repository } from 'typeorm';
import { Pond } from './pond.entity';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { FarmsService } from '../farms/farms.service';
export declare class PondsService {
    private pondsRepository;
    private farmsService;
    constructor(pondsRepository: Repository<Pond>, farmsService: FarmsService);
    create(createPondDto: CreatePondDto, userId: string): Promise<Pond>;
    findAll(farmId: string, userId: string): Promise<Pond[]>;
    findOne(id: string, userId: string): Promise<Pond>;
    update(id: string, updatePondDto: UpdatePondDto, userId: string): Promise<Pond>;
    remove(id: string, userId: string): Promise<import("typeorm").DeleteResult>;
}
