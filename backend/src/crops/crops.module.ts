import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropsService } from './crops.service';
import { CropsController } from './crops.controller';
import { Crop } from './crop.entity';
import { PondsModule } from '../ponds/ponds.module';
import { BiosecurityController } from './biosecurity.controller';
import { BiosecurityService } from './biosecurity.service';

@Module({
  imports: [TypeOrmModule.forFeature([Crop]), PondsModule],
  controllers: [CropsController, BiosecurityController],
  providers: [CropsService, BiosecurityService],
  exports: [CropsService, BiosecurityService],
})
export class CropsModule {}
