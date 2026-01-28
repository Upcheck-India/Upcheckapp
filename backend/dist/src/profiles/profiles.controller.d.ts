import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class ProfilesController {
    private readonly profilesService;
    constructor(profilesService: ProfilesService);
    create(createProfileDto: CreateProfileDto): Promise<import("./profile.entity").Profile>;
    findAll(): Promise<import("./profile.entity").Profile[]>;
    findOne(id: string): Promise<import("./profile.entity").Profile | null>;
    update(id: string, updateProfileDto: UpdateProfileDto, req: any): Promise<import("./profile.entity").Profile | null>;
}
