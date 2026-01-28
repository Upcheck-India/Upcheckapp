import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MicrobiologyData } from './microbiology-data.entity';
import { CreateMicrobiologyDataDto } from './dto/create-microbiology-data.dto';

@Injectable()
export class MicrobiologyService {
    constructor(
        @InjectRepository(MicrobiologyData)
        private microbiologyRepository: Repository<MicrobiologyData>,
    ) { }

    async create(dto: CreateMicrobiologyDataDto): Promise<MicrobiologyData> {
        const record = this.microbiologyRepository.create(dto);
        return this.microbiologyRepository.save(record);
    }

    async findByCrop(cropId: string): Promise<MicrobiologyData[]> {
        return this.microbiologyRepository.find({
            where: { cropId },
            order: { measurementDate: 'DESC' },
        });
    }
}
