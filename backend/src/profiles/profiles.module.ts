import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { Profile } from './profile.entity';
import { EmailService } from '../email.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Profile]), AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, EmailService],
  exports: [ProfilesService],
})
export class ProfilesModule { }
