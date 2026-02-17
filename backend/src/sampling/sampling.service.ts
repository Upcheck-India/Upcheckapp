import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SamplingData } from './sampling-data.entity';
import { CreateSamplingDto } from './dto/create-sampling.dto';
import { UpdateSamplingDto } from './dto/update-sampling.dto';

@Injectable()
export class SamplingService {
    constructor(
        @InjectRepository(SamplingData)
        private samplingRepository: Repository<SamplingData>,
    ) { }

    create(createDto: CreateSamplingDto) {
        const record = this.samplingRepository.create(createDto);
        return this.samplingRepository.save(record);
    }

    findAll(cropId?: string) {
        if (cropId) {
            return this.samplingRepository.find({
                where: { cropId },
                order: { samplingDate: 'DESC' },
            });
        }
        return this.samplingRepository.find({ order: { samplingDate: 'DESC' } });
    }

    findOne(id: string) {
        return this.samplingRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateSamplingDto) {
        await this.samplingRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.samplingRepository.delete(id);
    }
}
