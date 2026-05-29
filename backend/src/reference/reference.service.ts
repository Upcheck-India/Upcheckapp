import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Species } from './entities/species.entity';
import { Hatchery } from './entities/hatchery.entity';
import { Broodstock } from './entities/broodstock.entity';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { CreateHatcheryDto } from './dto/create-hatchery.dto';
import { UpdateHatcheryDto } from './dto/update-hatchery.dto';
import { CreateBroodstockDto } from './dto/create-broodstock.dto';
import { UpdateBroodstockDto } from './dto/update-broodstock.dto';

@Injectable()
export class ReferenceService {
    constructor(
        @InjectRepository(Species)
        private speciesRepository: Repository<Species>,
        @InjectRepository(Hatchery)
        private hatcheryRepository: Repository<Hatchery>,
        @InjectRepository(Broodstock)
        private broodstockRepository: Repository<Broodstock>,
    ) {}

    // ─── Species ──────────────────────────────────────────────

    createSpecies(dto: CreateSpeciesDto) {
        const species = this.speciesRepository.create(dto);
        return this.speciesRepository.save(species);
    }

    async findAllSpecies(search?: string): Promise<Species[]> {
        if (search) {
            return this.speciesRepository.find({
                where: [
                    { scientificName: ILike(`%${search}%`) },
                    { commonName: ILike(`%${search}%`) },
                ],
                order: { scientificName: 'ASC' },
            });
        }
        return this.speciesRepository.find({ order: { scientificName: 'ASC' } });
    }

    async findOneSpecies(id: string): Promise<Species> {
        const species = await this.speciesRepository.findOneBy({ id });
        if (!species) throw new NotFoundException(`Species with ID ${id} not found`);
        return species;
    }

    async updateSpecies(id: string, dto: UpdateSpeciesDto): Promise<Species> {
        await this.speciesRepository.update(id, dto);
        return this.findOneSpecies(id);
    }

    async removeSpecies(id: string): Promise<void> {
        const result = await this.speciesRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException(`Species with ID ${id} not found`);
    }

    // ─── Hatcheries ───────────────────────────────────────────

    createHatchery(dto: CreateHatcheryDto) {
        const hatchery = this.hatcheryRepository.create(dto);
        return this.hatcheryRepository.save(hatchery);
    }

    async findAllHatcheries(search?: string): Promise<Hatchery[]> {
        if (search) {
            return this.hatcheryRepository.find({
                where: [
                    { name: ILike(`%${search}%`) },
                    { location: ILike(`%${search}%`) },
                ],
                order: { name: 'ASC' },
            });
        }
        return this.hatcheryRepository.find({ order: { name: 'ASC' } });
    }

    async findOneHatchery(id: string): Promise<Hatchery> {
        const hatchery = await this.hatcheryRepository.findOneBy({ id });
        if (!hatchery) throw new NotFoundException(`Hatchery with ID ${id} not found`);
        return hatchery;
    }

    async updateHatchery(id: string, dto: UpdateHatcheryDto): Promise<Hatchery> {
        await this.hatcheryRepository.update(id, dto);
        return this.findOneHatchery(id);
    }

    async removeHatchery(id: string): Promise<void> {
        const result = await this.hatcheryRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException(`Hatchery with ID ${id} not found`);
    }

    // ─── Broodstock ───────────────────────────────────────────

    createBroodstock(dto: CreateBroodstockDto) {
        const broodstock = this.broodstockRepository.create(dto);
        return this.broodstockRepository.save(broodstock);
    }

    async findAllBroodstock(search?: string): Promise<Broodstock[]> {
        if (search) {
            return this.broodstockRepository.find({
                where: [
                    { supplier: ILike(`%${search}%`) },
                    { lineCode: ILike(`%${search}%`) },
                    { origin: ILike(`%${search}%`) },
                ],
                order: { supplier: 'ASC' },
            });
        }
        return this.broodstockRepository.find({ order: { supplier: 'ASC' } });
    }

    async findOneBroodstock(id: string): Promise<Broodstock> {
        const broodstock = await this.broodstockRepository.findOneBy({ id });
        if (!broodstock) throw new NotFoundException(`Broodstock with ID ${id} not found`);
        return broodstock;
    }

    async updateBroodstock(id: string, dto: UpdateBroodstockDto): Promise<Broodstock> {
        await this.broodstockRepository.update(id, dto);
        return this.findOneBroodstock(id);
    }

    async removeBroodstock(id: string): Promise<void> {
        const result = await this.broodstockRepository.delete(id);
        if (result.affected === 0) throw new NotFoundException(`Broodstock with ID ${id} not found`);
    }
}
