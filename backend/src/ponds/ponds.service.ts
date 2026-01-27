import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pond } from './pond.entity';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';

@Injectable()
export class PondsService {
    constructor(
        @InjectRepository(Pond)
        private pondsRepository: Repository<Pond>,
    ) { }

    create(createPondDto: CreatePondDto) {
        const pond = this.pondsRepository.create(createPondDto);
        return this.pondsRepository.save(pond);
    }

    findAll(farmId?: string) {
        if (farmId) {
            return this.pondsRepository.find({ where: { farmId } });
        }
        return this.pondsRepository.find();
    }

    findByFarm(farmId: string) {
        return this.pondsRepository.find({ where: { farmId } });
    }

    findOne(id: string) {
        return this.pondsRepository.findOneBy({ id });
    }

    async update(id: string, updatePondDto: UpdatePondDto) {
        await this.pondsRepository.update(id, updatePondDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.pondsRepository.delete(id);
    }
}
