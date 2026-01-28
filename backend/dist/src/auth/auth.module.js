"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const otp_code_entity_1 = require("./otp-code.entity");
const otp_rate_limit_service_1 = require("./otp-rate-limit.service");
const otp_cleanup_service_1 = require("./otp-cleanup.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([otp_code_entity_1.OtpCode]), schedule_1.ScheduleModule.forRoot()],
        providers: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, otp_rate_limit_service_1.OtpRateLimitService, otp_cleanup_service_1.OtpCleanupService],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map