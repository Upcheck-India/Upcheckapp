import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { FarmMembersService } from './farm-members.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
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

    /** Change a member's role (owner only). */
    @Patch('farms/:farmId/members/:userId')
    changeRole(
        @Param('farmId') farmId: string,
        @Param('userId') userId: string,
        @Body() dto: ChangeRoleDto,
        @CurrentUser() user,
    ) {
        return this.membersService.changeMemberRole(farmId, user.id, userId, dto.role);
    }

    /** Transfer farm ownership to an existing member (owner only). */
    @Post('farms/:farmId/transfer-ownership')
    transferOwnership(
        @Param('farmId') farmId: string,
        @Body() dto: TransferOwnershipDto,
        @CurrentUser() user,
    ) {
        return this.membersService.transferOwnership(farmId, user.id, dto.newOwnerUserId);
    }
}
