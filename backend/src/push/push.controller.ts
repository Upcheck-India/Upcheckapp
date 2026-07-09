import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PushService } from './push.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register')
  register(@CurrentUser() user, @Body() body: RegisterPushTokenDto) {
    return this.pushService.registerToken(user.id, body.token);
  }

  @Delete('register')
  @HttpCode(HttpStatus.OK)
  unregister(@CurrentUser() user) {
    return this.pushService.clearToken(user.id);
  }
}
