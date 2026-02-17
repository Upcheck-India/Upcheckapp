import { Injectable } from '@nestjs/common';
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

    findOne(id: string) {
        return this.checksRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateFeedingTrayCheckDto) {
        await this.checksRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.checksRepository.delete(id);
    }
}
