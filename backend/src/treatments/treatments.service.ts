import { Injectable, NotFoundException } from '@nestjs/common';
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

    create(createDto: CreateTreatmentDto, userId?: string) {
        const record = this.treatmentsRepository.create({ ...createDto, createdById: userId, updatedById: userId });
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

    async findOne(id: string): Promise<Treatment> {
        const record = await this.treatmentsRepository.findOneBy({ id });
        if (!record) throw new NotFoundException(`Treatment with ID ${id} not found`);
        return record;
    }

    async update(id: string, updateDto: UpdateTreatmentDto, userId?: string): Promise<Treatment> {
        await this.findOne(id);
        await this.treatmentsRepository.update(id, { ...updateDto, ...(userId ? { updatedById: userId } : {}) });
        return this.findOne(id);
    }

    async remove(id: string): Promise<{ message: string }> {
        await this.findOne(id);
        await this.treatmentsRepository.delete(id);
        return { message: 'Treatment deleted successfully' };
    }
}
