import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfilesService {
    private profilesRepository;
    constructor(profilesRepository: Repository<Profile>);
    create(createProfileDto: CreateProfileDto): Promise<Profile>;
    findAll(): Promise<Profile[]>;
    findOne(id: string): Promise<Profile | null>;
    update(id: string, updateProfileDto: UpdateProfileDto): Promise<Profile | null>;
}
