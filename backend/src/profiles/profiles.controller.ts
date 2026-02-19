import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException, Logger } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
    private readonly logger = new Logger(ProfilesController.name);

    constructor(private readonly profilesService: ProfilesService) { }

    @Post()
    create(@Body() createProfileDto: CreateProfileDto) {
        this.logger.log(`POST /profiles — body: ${JSON.stringify(createProfileDto)}`);
        return this.profilesService.create(createProfileDto);
    }

    @Get()
    findAll() {
        this.logger.log('GET /profiles — findAll called');
        return this.profilesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        this.logger.log(`GET /profiles/${id} — req.user: ${JSON.stringify(req.user)}`);
        const result = await this.profilesService.findOne(id);
        this.logger.log(`GET /profiles/${id} — result: ${result ? 'found' : 'NOT FOUND (null)'}`);
        return result;
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto, @Request() req) {
        this.logger.log(`PATCH /profiles/${id} — req.user.id: ${req.user?.id}`);
        if (id !== req.user.id) {
            this.logger.warn(`PATCH /profiles/${id} — FORBIDDEN: req.user.id=${req.user?.id} != param id=${id}`);
            throw new ForbiddenException('You can only update your own profile');
        }
        return this.profilesService.update(id, updateProfileDto);
    }
}
