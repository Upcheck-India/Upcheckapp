import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanktonData } from './plankton-data.entity';
import { CreatePlanktonDataDto } from './dto/create-plankton-data.dto';

@Injectable()
export class PlanktonService {
    constructor(
        @InjectRepository(PlanktonData)
        private planktonRepository: Repository<PlanktonData>,
    ) { }

    async create(dto: CreatePlanktonDataDto): Promise<PlanktonData> {
        // Auto-calculate total
        const total = (dto.greenAlgaeGaCellMl || 0) +
            (dto.blueGreenAlgaeBgaCellMl || 0) +
            (dto.dinoflagellataCellMl || 0) +
            (dto.diatomCellMl || 0) +
            (dto.protozoaCellMl || 0) +
            (dto.flocCellMl || 0) +
            (dto.goldenBrownAlgaeCellMl || 0) +
            (dto.euglenophytaCellMl || 0) +
            (dto.zooCellMl || 0) +
            (dto.haptoyphytaCellMl || 0) +
            (dto.goldenGreenAlgaeCellMl || 0) +
            (dto.yellowGreenAlgaeCellMl || 0) +
            (dto.otherPlanktonCellMl || 0);

        const record = this.planktonRepository.create({
            ...dto,
            totalPlanktonCellMl: total,
        });

        return this.planktonRepository.save(record);
    }

    async findByCrop(cropId: string): Promise<PlanktonData[]> {
        return this.planktonRepository.find({
            where: { cropId },
            order: { measurementDate: 'DESC', measurementTime: 'DESC' },
        });
    }
}
