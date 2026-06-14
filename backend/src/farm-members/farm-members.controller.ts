import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { FarmMembersService } from './farm-members.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { LookupUserDto } from './dto/lookup-user.dto';

@Controller()
export class FarmMembersController {
    constructor(private readonly membersService: FarmMembersService) {}

    /** Resolve a user to add by their unique id (QR), phone or email. */
    @Get('farm-members/users/lookup')
    lookup(@Query() query: LookupUserDto) {
        if (!query.userId && !query.phone && !query.email) {
            throw new BadRequestException('Provide a userId, phone or email to look up');
        }
        return this.membersService.lookupUser(query);
    }

    /** Farms the caller is a member of (owner or worker), with their role. */
    @Get('farm-members/mine')
    mine(@CurrentUser() user) {
        return this.membersService.listMine(user.id);
    }

    @Get('farms/:farmId/members')
    list(@Param('farmId') farmId: string, @CurrentUser() user) {
        return this.membersService.listMembers(farmId, user.id);
    }

    @Post('farms/:farmId/members')
    add(@Param('farmId') farmId: string, @Body() dto: AddMemberDto, @CurrentUser() user) {
        return this.membersService.addMember(farmId, user.id, dto);
    }

    @Delete('farms/:farmId/members/:userId')
    remove(@Param('farmId') farmId: string, @Param('userId') userId: string, @CurrentUser() user) {
        return this.membersService.removeMember(farmId, user.id, userId);
    }
}
