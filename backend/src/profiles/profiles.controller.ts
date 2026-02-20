import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException, Logger, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/auth.decorators';
import { EmailService } from '../email.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
    private readonly logger = new Logger(ProfilesController.name);

    constructor(
        private readonly profilesService: ProfilesService,
        private readonly emailService: EmailService,
    ) { }

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

    @Public()
    @Get('check-username/:username')
    async checkUsername(@Param('username') username: string) {
        const existing = await this.profilesService.findByUsername(username);
        return { available: !existing };
    }

    @Public()
    @Get('public/:username')
    async findPublicByUsername(@Param('username') username: string) {
        const profile = await this.profilesService.findPublicByUsername(username);
        if (!profile) throw new NotFoundException('Profile not found');
        return profile;
    }

    @Post('invite')
    async inviteFriend(@Body() body: { toEmail: string }, @Request() req) {
        const inviterProfile = await this.profilesService.findOne(req.user.id);
        const inviterName = inviterProfile?.fullName || inviterProfile?.username || req.user.email;
        await this.emailService.sendInviteEmail(body.toEmail, inviterName);
        return { success: true };
    }

    @Get('me')
    async findMe(@Request() req) {
        const { id, email } = req.user;
        this.logger.log(`GET /profiles/me — user.id: ${id}`);
        return this.profilesService.upsert(id, email);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        this.logger.log(`GET /profiles/${id} — req.user: ${JSON.stringify(req.user)}`);
        const result = await this.profilesService.upsert(id, req.user?.email ?? '');
        this.logger.log(`GET /profiles/${id} — result: ${result ? 'found/created' : 'ERROR'}`);
        return result;
    }

    @Delete('me')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMe(@Request() req) {
        this.logger.log(`DELETE /profiles/me — user.id: ${req.user.id}`);
        await this.profilesService.deleteAccount(req.user.id);
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
