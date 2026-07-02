import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SamplingData } from './sampling-data.entity';
import { CreateSamplingDto } from './dto/create-sampling.dto';
import { UpdateSamplingDto } from './dto/update-sampling.dto';

import { PondsService } from '../ponds/ponds.service';
import { FarmAccessService } from '../farm-access/farm-access.service';

@Injectable()
export class SamplingService {
    constructor(
        @InjectRepository(SamplingData)
        private samplingRepository: Repository<SamplingData>,
        private pondsService: PondsService,
        private readonly farmAccess: FarmAccessService,
    ) { }

    async create(createDto: CreateSamplingDto, userId: string) {
        // Idempotent replay guard for offline queue drains. Must verify the
        // caller can access the found record's farm BEFORE returning it — a
        // replayed op with a guessed id must not leak another farm's record.
        if (createDto.id) {
            const existing = await this.samplingRepository.findOne({ where: { id: createDto.id } });
            if (existing) {
                await this.farmAccess.assertCanAccessPond(userId, existing.pondId, 'WRITE_OPERATIONAL');
                return existing;
            }
        }

        const pond = await this.pondsService.findOneAccessible(createDto.pondId, userId, 'WRITE_OPERATIONAL');

        const record = this.samplingRepository.create({
            id: createDto.id,
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

    async findAll(userId: string, cropId?: string) {
        // Scope to farms the caller can access — cropId alone is an optional
        // filter, never the ownership boundary.
        const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
        if (farmIds.length === 0) return [];

        const qb = this.samplingRepository
            .createQueryBuilder('sampling')
            .innerJoin('sampling.pond', 'pond')
            .where('pond.farmId IN (:...farmIds)', { farmIds })
            .orderBy('sampling.samplingDate', 'DESC');
        if (cropId) qb.andWhere('sampling.cropId = :cropId', { cropId });
        return qb.getMany();
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
