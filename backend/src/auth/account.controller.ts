import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';
import { AccountService } from './account.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AccountEmailCodeDto,
  ChangeEmailDto,
  LinkGoogleDto,
  SetPasswordDto,
} from './dto/account.dto';
import { AUTH_THROTTLE, SENSITIVE_THROTTLE } from './supabase-auth.controller';

/**
 * Self-service account changes. SupabaseAuthGuard (not only the global JWT
 * check) so a revoked session cannot change credentials during the local
 * verification window.
 */
@Controller('auth/supabase/account')
@UseGuards(SupabaseAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Throttle(SENSITIVE_THROTTLE)
  @Post('email-code')
  @HttpCode(HttpStatus.OK)
  emailCode(@CurrentUser() user: User, @Body() body: AccountEmailCodeDto) {
    return this.accountService.requestEmailCode(
      user.id,
      body.purpose,
      body.newEmail,
    );
  }

  @Throttle(SENSITIVE_THROTTLE)
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@CurrentUser() user: User, @Body() body: SetPasswordDto) {
    return this.accountService.setPassword(user.id, body.code, body.newPassword);
  }

  @Throttle(SENSITIVE_THROTTLE)
  @Post('change-email')
  @HttpCode(HttpStatus.OK)
  changeEmail(@CurrentUser() user: User, @Body() body: ChangeEmailDto) {
    return this.accountService.changeEmail(
      user.id,
      body.newEmail,
      body.code,
      body.currentPassword,
    );
  }

  @Throttle(AUTH_THROTTLE)
  @Post('link-google')
  @HttpCode(HttpStatus.OK)
  linkGoogle(@Req() request: any, @Body() body: LinkGoogleDto) {
    const token = request.headers.authorization?.substring(7);
    return this.accountService.linkGoogle(token, body.idToken);
  }
}
