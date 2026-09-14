import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmMember } from '../farm-access/farm-member.entity';
import { Farm } from '../farms/farm.entity';
import { Profile } from '../profiles/profile.entity';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

@Module({
  imports: [TypeOrmModule.forFeature([FarmMember, Farm, Profile])],
  controllers: [FeaturesController],
  providers: [FeaturesService],
})
export class FeaturesModule {}
