import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { User } from '../auth/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [PushController],
    providers: [PushService],
    exports: [PushService],
})
export class PushModule { }
