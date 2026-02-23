import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WaterQualityRecord } from './water-quality-record.entity';
import { CreateWaterQualityRecordDto } from './dto/create-water-quality-record.dto';
import { UpdateWaterQualityRecordDto } from './dto/update-water-quality-record.dto';
import { PondsService } from '../ponds/ponds.service';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageMetaDto, PageDto } from '../common/dto/page.dto';

@Injectable()
export class WaterQualityService {
    constructor(
        @InjectRepository(WaterQualityRecord)
        private recordsRepository: Repository<WaterQualityRecord>,
        private pondsService: PondsService,
    ) { }

    async create(createDto: CreateWaterQualityRecordDto, userId: string) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(createDto.pondId, userId);

        const record = this.recordsRepository.create(createDto);
        return this.recordsRepository.save(record);
    }

    async findAll(pondId: string, userId: string, pageOptionsDto?: PageOptionsDto): Promise<PageDto<WaterQualityRecord>> {
        if (!pondId) {
            return new PageDto([], new PageMetaDto({ itemCount: 0, pageOptionsDto: pageOptionsDto || { page: 1, take: 10 } }));
        }

        const skip = pageOptionsDto?.skip || 0;
        const take = pageOptionsDto?.take || 10;
        const order = pageOptionsDto?.order || 'DESC';

        const [items, itemCount] = await this.recordsRepository.findAndCount({
            where: { pondId },
            order: { recordedAt: order },
            take,
            skip,
        });

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto: pageOptionsDto || { page: 1, take } });
        return new PageDto(items, pageMetaDto);
    }

    async findByPond(pondId: string, userId: string, startDate?: Date, endDate?: Date) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

        if (startDate && endDate) {
            return this.recordsRepository.find({
                where: {
                    pondId,
                    recordedAt: Between(startDate, endDate),
                },
                order: { recordedAt: 'DESC' },
            });
        }
        return this.recordsRepository.find({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }

    async findOne(id: string, userId: string) {
        const record = await this.recordsRepository.findOneBy({ id });
        if (!record) {
            throw new NotFoundException(`WaterQualityRecord with ID ${id} not found`);
        }
        // Verify ownership via pond
        await this.pondsService.verifyOwner(record.pondId, userId);
        return record;
    }

    async update(id: string, updateDto: UpdateWaterQualityRecordDto, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        await this.recordsRepository.update(id, updateDto);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId); // Verify ownership
        return this.recordsRepository.delete(id);
    }

    async getLatestByPond(pondId: string, userId: string) {
        // Verify user owns the pond
        await this.pondsService.verifyOwner(pondId, userId);

        return this.recordsRepository.findOne({
            where: { pondId },
            order: { recordedAt: 'DESC' },
        });
    }
}
