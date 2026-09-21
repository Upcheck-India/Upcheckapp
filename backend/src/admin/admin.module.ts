import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { Farm } from '../farms/farm.entity';
import { FarmMember } from '../farm-access/farm-member.entity';
import { Pond } from '../ponds/pond.entity';
import { Crop } from '../crops/crop.entity';
import { AdminKeyGuard } from '../feedback/admin-key.guard';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';

/** C4: admin dashboard overview + read-only users/farms lookup. */
@Module({
  imports: [TypeOrmModule.forFeature([User, Farm, FarmMember, Pond, Crop])],
  controllers: [AdminOverviewController, AdminDirectoryController],
  providers: [AdminOverviewService, AdminDirectoryService, AdminKeyGuard],
})
export class AdminModule {}
