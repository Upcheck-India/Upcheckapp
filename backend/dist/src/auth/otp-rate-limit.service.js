"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpRateLimitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const otp_code_entity_1 = require("./otp-code.entity");
let OtpRateLimitService = class OtpRateLimitService {
    otpRepository;
    constructor(otpRepository) {
        this.otpRepository = otpRepository;
    }
    async checkDailyLimit(email, phone) {
        const target = email || phone;
        if (!target)
            return true;
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const count = await this.otpRepository.count({
            where: {
                ...(email ? { email } : { phone }),
                createdAt: (0, typeorm_2.MoreThanOrEqual)(startOfDay),
            },
        });
        return count < 10;
    }
    async checkResendCooldown(email, phone) {
        const target = email || phone;
        if (!target)
            return true;
        const recent = await this.otpRepository.findOne({
            where: {
                ...(email ? { email } : { phone }),
                createdAt: (0, typeorm_2.MoreThanOrEqual)(new Date(Date.now() - 60 * 1000)),
            },
            order: { createdAt: 'DESC' },
        });
        return !recent;
    }
};
exports.OtpRateLimitService = OtpRateLimitService;
exports.OtpRateLimitService = OtpRateLimitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(otp_code_entity_1.OtpCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OtpRateLimitService);
//# sourceMappingURL=otp-rate-limit.service.js.map