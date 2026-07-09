import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmMember } from '../farm-access/farm-member.entity';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { FarmMembersController } from './farm-members.controller';
import { FarmMembersService } from './farm-members.service';

/**
 * Team-membership API: look up users, add/remove farm workers, list members,
 * and list the farms the caller belongs to. Authorization is enforced via the
 * global FarmAccessService (owner-only for add/remove). Auth itself is untouched.
 */
@Module({
  imports: [TypeOrmModule.forFeature([FarmMember, User, Farm])],
  controllers: [FarmMembersController],
  providers: [FarmMembersService],
  exports: [FarmMembersService],
})
export class FarmMembersModule {}
