"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const otp_cleanup_service_1 = require("../src/auth/otp-cleanup.service");
async function runCleanup() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error'],
    });
    const cleanup = app.get(otp_cleanup_service_1.OtpCleanupService);
    await cleanup.cleanupExpiredOtps();
    await app.close();
}
runCleanup().catch((err) => {
    console.error('OTP cleanup failed:', err);
    process.exit(1);
});
//# sourceMappingURL=otp-cleanup-runner.js.map