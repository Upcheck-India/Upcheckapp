import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
    constructor(
        @InjectRepository(Profile)
        private profilesRepository: Repository<Profile>,
    ) { }

    create(createProfileDto: CreateProfileDto) {
        // In a real app, ID typically comes from Auth (Supabase Auth ID)
        // For now, we assume the DTO or logic handles ID generation/assignment
        // NOTE: Profiles are typically created via triggers, but we support manual creation if needed
        const profile = this.profilesRepository.create(createProfileDto);
        return this.profilesRepository.save(profile);
    }

    findAll() {
        return this.profilesRepository.find();
    }

    findOne(id: string) {
        return this.profilesRepository.findOneBy({ id });
    }

    async update(id: string, updateProfileDto: UpdateProfileDto) {
        await this.profilesRepository.update(id, updateProfileDto);
        return this.findOne(id);
    }
}
