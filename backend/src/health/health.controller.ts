import { Controller } from '@nestjs/common';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { Public } from '../auth/decorators/auth.decorators';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private memory: MemoryHealthIndicator,
    ) {}

    /**
     * Comprehensive health check endpoint for Render.
     * Checks:
     * - Database connection (TypeORM/PostgreSQL)
     * - Memory heap usage (warns if > 150MB)
     * - Process uptime
     *
     * Render uses this endpoint to determine if the service is healthy.
     * During cold starts, this endpoint must return 200 OK for the service
     * to be considered "up" and start accepting requests.
     */
    @Public()
    @HealthCheck()
    check() {
        return this.health.check([
            // Database ping - critical for Render health check
            () => this.db.pingCheck('database', {
                timeout: 10000, // 10 seconds timeout for database ping
            }),
            // Memory check - warn if heap exceeds 150MB
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
            // RSS memory check - warn if RSS exceeds 300MB
            () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        ]);
    }

    /**
     * Simple health check for quick liveness probe.
     * This is used by Render's startup probe during cold starts.
     * It doesn't check database - just returns "ok" if the process is alive.
     */
    @Public()
    checkLiveness() {
        return {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }
}