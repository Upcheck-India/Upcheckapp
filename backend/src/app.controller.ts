import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/auth.decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Root endpoint - simple hello message.
   * Not used for health checks.
   */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Simple liveness check at /api/liveness.
   * Used by Render's startup probe during cold starts.
   * This endpoint just checks if the process is alive - doesn't check database.
   * Render uses this to know when the app has started.
   */
  @Public()
  @Get('liveness')
  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
