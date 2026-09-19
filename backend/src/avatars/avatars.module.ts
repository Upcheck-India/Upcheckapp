import { Global, Module } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarsController } from './avatars.controller';

/** Global: member lists, the daily brief and account deletion all need it. */
@Global()
@Module({
  controllers: [AvatarsController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarsModule {}
