import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropsService } from './crops.service';
import { CropsController } from './crops.controller';
import { Crop } from './crop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Crop])],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService],
})
export class CropsModule { }
