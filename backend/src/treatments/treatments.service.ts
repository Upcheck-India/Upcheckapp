import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Treatment } from './treatment.entity';
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';

@Injectable()
export class TreatmentsService {
    constructor(
        @InjectRepository(Treatment)
        private treatmentsRepository: Repository<Treatment>,
    ) { }

    create(createDto: CreateTreatmentDto) {
        const record = this.treatmentsRepository.create(createDto);
        return this.treatmentsRepository.save(record);
    }

    findAll(cropId?: string) {
        if (cropId) {
            return this.treatmentsRepository.find({
                where: { cropId },
                order: { treatmentDate: 'DESC' },
            });
        }
        return this.treatmentsRepository.find({ order: { treatmentDate: 'DESC' } });
    }

    findOne(id: string) {
        return this.treatmentsRepository.findOneBy({ id });
    }

    async update(id: string, updateDto: UpdateTreatmentDto) {
        await this.treatmentsRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.treatmentsRepository.delete(id);
    }
}
