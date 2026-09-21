import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/auth.decorators';
import { AdminKeyGuard } from '../feedback/admin-key.guard';

/**
 * C5.1: the admin dashboard's own login. `POST` doesn't apply — a key is
 * either valid or it isn't — so signing in is just this GET: AdminKeyGuard
 * either throws (unknown/missing key) or attaches `req.adminStaff`, which
 * this returns. `admin/login/actions.ts` on the dashboard calls this to
 * validate a pasted key before storing it in the session cookie.
 */
@Public()
@UseGuards(AdminKeyGuard)
@Controller('admin/whoami')
export class AdminWhoamiController {
  @Get()
  whoami(@Req() req: any): { staff: string } {
    return { staff: req.adminStaff };
  }
}
