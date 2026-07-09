import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/auth.decorators';
import { RedisService } from '../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

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

    // Redis check — 'degraded' (not 'down') on the in-memory fallback: the app
    // still works on one instance, but shared-state guarantees are weakened.
    checks['redis'] = {
      status: this.redis.isMemoryFallback ? 'degraded' : 'up',
    };

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

    // Database is the only hard dependency. If it's down, return HTTP 503 so
    // Render's health probe pulls the instance out of rotation instead of
    // leaving a broken instance serving 500s (a 200 body would keep it live).
    const dbDown = checks['database'].status === 'down';
    const payload = {
      status: dbDown ? 'error' : 'ok',
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    if (dbDown) throw new ServiceUnavailableException(payload);
    return payload;
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
