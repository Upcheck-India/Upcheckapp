import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedingTrayCheck } from './feeding-tray-check.entity';
import { CreateFeedingTrayCheckDto } from './dto/create-feeding-tray-check.dto';
import { UpdateFeedingTrayCheckDto } from './dto/update-feeding-tray-check.dto';

@Injectable()
export class FeedingTrayChecksService {
    constructor(
        @InjectRepository(FeedingTrayCheck)
        private checksRepository: Repository<FeedingTrayCheck>,
    ) { }

    create(createDto: CreateFeedingTrayCheckDto) {
        const record = this.checksRepository.create(createDto);
        return this.checksRepository.save(record);
    }

    findAll(cropId?: string) {
        if (cropId) {
            return this.checksRepository.find({
                where: { cropId },
                order: { checkDate: 'DESC' },
            });
        }
        return this.checksRepository.find({ order: { checkDate: 'DESC' } });
    }

    async findOne(id: string): Promise<FeedingTrayCheck> {
        const record = await this.checksRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Feeding tray check with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateFeedingTrayCheckDto): Promise<FeedingTrayCheck> {
        await this.findOne(id);
        await this.checksRepository.update(id, updateDto);
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.checksRepository.delete(id);
        return { message: 'Feeding tray check deleted successfully' };
    }
}
