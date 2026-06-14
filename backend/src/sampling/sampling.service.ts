import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SamplingData } from './sampling-data.entity';
import { CreateSamplingDto } from './dto/create-sampling.dto';
import { UpdateSamplingDto } from './dto/update-sampling.dto';

import { PondsService } from '../ponds/ponds.service';

@Injectable()
export class SamplingService {
    constructor(
        @InjectRepository(SamplingData)
        private samplingRepository: Repository<SamplingData>,
        private pondsService: PondsService,
    ) { }

    async create(createDto: CreateSamplingDto, userId: string) {
        const pond = await this.pondsService.findOneAccessible(createDto.pondId, userId, 'WRITE_OPERATIONAL');

        const record = this.samplingRepository.create({
            pondId: createDto.pondId,
            cropId: pond.activeCycleId,
            samplingDate: createDto.samplingDate,
            mbwG: createDto.mbwG,
            totalSamples: createDto.totalSamples,
            stdDeviation: createDto.stdDeviation,
            biomassEstimationKg: createDto.biomassEstimationKg,
            srEstimationPercent: createDto.srEstimationPercent,
            notes: createDto.notes,
            photoUrls: createDto.photoUrls,
            createdById: userId,
            updatedById: userId,
        });
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

    async findOne(id: string): Promise<SamplingData> {
        const record = await this.samplingRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Sampling data with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateSamplingDto, userId?: string): Promise<SamplingData> {
        await this.findOne(id);
        await this.samplingRepository.update(id, { ...updateDto, ...(userId ? { updatedById: userId } : {}) });
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.samplingRepository.delete(id);
        return { message: 'Sampling data deleted successfully' };
    }
}
