import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/auth.decorators';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Comprehensive health check endpoint for Render.
   * Checks database connection by running a simple query.
   */
  @Public()
  @Get()
  async check() {
    const checks: Record<string, { status: string; details?: any }> = {};

    // Database check
    try {
      // Run a simple query to verify database connection
      await this.dataSource.query('SELECT 1');
      checks['database'] = { status: 'up' };
    } catch (error: any) {
      checks['database'] = {
        status: 'down',
        details: error.message,
      };
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    checks['memory'] = {
      status: 'up',
      details: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };

    // Overall status - unhealthy if any critical check fails
    const allHealthy = checks['database'].status === 'up';

    return {
      status: allHealthy ? 'ok' : 'error',
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Simple liveness check for Render startup probe.
   * This endpoint just checks if the process is alive - doesn't require database.
   */
  @Public()
  @Get('liveness')
  checkLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
