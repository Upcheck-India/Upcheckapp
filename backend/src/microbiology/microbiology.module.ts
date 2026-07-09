import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicrobiologyController } from './microbiology.controller';
import { MicrobiologyData } from './microbiology-data.entity';
import { MicrobiologyService } from './microbiology.service';

@Module({
  imports: [TypeOrmModule.forFeature([MicrobiologyData])],
  controllers: [MicrobiologyController],
  providers: [MicrobiologyService],
})
export class MicrobiologyModule {}
