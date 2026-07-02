import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedingTrayCheck } from './feeding-tray-check.entity';
import { CreateFeedingTrayCheckDto } from './dto/create-feeding-tray-check.dto';
import { UpdateFeedingTrayCheckDto } from './dto/update-feeding-tray-check.dto';
import { FarmAccessService } from '../farm-access/farm-access.service';

@Injectable()
export class FeedingTrayChecksService {
    constructor(
        @InjectRepository(FeedingTrayCheck)
        private checksRepository: Repository<FeedingTrayCheck>,
        private readonly farmAccess: FarmAccessService,
    ) { }

    create(createDto: CreateFeedingTrayCheckDto, userId?: string) {
        const record = this.checksRepository.create({ ...createDto, createdById: userId, updatedById: userId });
        return this.checksRepository.save(record);
    }

    async findAll(userId: string, cropId?: string) {
        // Scope to farms the caller can access — cropId alone is an optional
        // filter, never the ownership boundary.
        const farmIds = await this.farmAccess.getAccessibleFarmIds(userId);
        if (farmIds.length === 0) return [];

        const qb = this.checksRepository
            .createQueryBuilder('ftc')
            .innerJoin('ftc.crop', 'crop')
            .innerJoin('crop.pond', 'pond')
            .where('pond.farmId IN (:...farmIds)', { farmIds })
            .orderBy('ftc.checkDate', 'DESC');
        if (cropId) qb.andWhere('ftc.cropId = :cropId', { cropId });
        return qb.getMany();
    }

    async findOne(id: string): Promise<FeedingTrayCheck> {
        const record = await this.checksRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Feeding tray check with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateFeedingTrayCheckDto, userId?: string): Promise<FeedingTrayCheck> {
        await this.findOne(id);
        await this.checksRepository.update(id, { ...updateDto, ...(userId ? { updatedById: userId } : {}) });
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.checksRepository.delete(id);
        return { message: 'Feeding tray check deleted successfully' };
    }
}
