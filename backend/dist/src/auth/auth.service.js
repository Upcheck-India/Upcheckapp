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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const otp_code_entity_1 = require("./otp-code.entity");
const otp_rate_limit_service_1 = require("./otp-rate-limit.service");
let AuthService = class AuthService {
    configService;
    otpRepository;
    otpRateLimitService;
    supabase;
    brevoApiKey;
    brevoEmailSenderName;
    brevoEmailSenderEmail;
    brevoSmsSender;
    constructor(configService, otpRepository, otpRateLimitService) {
        this.configService = configService;
        this.otpRepository = otpRepository;
        this.otpRateLimitService = otpRateLimitService;
        this.supabase = (0, supabase_js_1.createClient)(this.configService.get('SUPABASE_URL') || '', this.configService.get('SUPABASE_ANON_KEY') || '');
        this.brevoApiKey = this.configService.get('BREVO_API_KEY') || '';
        this.brevoEmailSenderName = this.configService.get('BREVO_EMAIL_SENDER_NAME') || 'Upcheck';
        this.brevoEmailSenderEmail = this.configService.get('BREVO_EMAIL_SENDER_EMAIL') || '';
        this.brevoSmsSender = this.configService.get('BREVO_SMS_SENDER') || 'Upcheck';
    }
    async register(registerDto) {
        const { email, password, fullName } = registerDto;
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) {
            throw new common_1.BadRequestException(error.message);
        }
        return {
            message: 'Registration successful. Please check your email to verify.',
            user: data.user,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw new common_1.UnauthorizedException(error.message);
        }
        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: data.user,
        };
    }
    async sendOtp(sendOtpDto) {
        const { email, phone } = sendOtpDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email or phone is required');
        }
        if (!this.brevoApiKey) {
            throw new common_1.BadRequestException('Brevo API key not configured');
        }
        if (!(await this.otpRateLimitService.checkDailyLimit(email, phone))) {
            throw new common_1.BadRequestException('Daily OTP limit exceeded. Please try again tomorrow.');
        }
        if (!(await this.otpRateLimitService.checkResendCooldown(email, phone))) {
            throw new common_1.BadRequestException('Please wait before requesting another OTP.');
        }
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        if (email) {
            if (!this.brevoEmailSenderEmail) {
                throw new common_1.BadRequestException('Brevo email sender not configured');
            }
            await this.sendBrevoEmail(email, otp);
            await this.otpRepository.save(this.otpRepository.create({ email, code: otp, expiresAt }));
        }
        if (phone) {
            await this.sendBrevoSms(phone, otp);
            await this.otpRepository.save(this.otpRepository.create({ phone, code: otp, expiresAt }));
        }
        return {
            message: 'OTP sent successfully.',
        };
    }
    async verifyOtp(verifyOtpDto) {
        const { email, phone, token } = verifyOtpDto;
        if (!email && !phone) {
            throw new common_1.BadRequestException('Email or phone is required');
        }
        const otpRecord = await this.otpRepository.findOne({
            where: email ? { email, code: token } : { phone, code: token },
            order: { createdAt: 'DESC' },
        });
        if (!otpRecord) {
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        if (otpRecord.expiresAt.getTime() < Date.now()) {
            throw new common_1.UnauthorizedException('OTP expired');
        }
        if (otpRecord.verifiedAt) {
            throw new common_1.UnauthorizedException('OTP already used');
        }
        otpRecord.verifiedAt = new Date();
        await this.otpRepository.save(otpRecord);
        return {
            verified: true,
            message: 'OTP verified successfully.',
        };
    }
    generateOtp() {
        return (0, crypto_1.randomInt)(100000, 999999).toString();
    }
    getBrevoApiKey() {
        return this.brevoApiKey;
    }
    getBrevoEmailSender() {
        return this.brevoEmailSenderEmail ? { name: this.brevoEmailSenderName, email: this.brevoEmailSenderEmail } : null;
    }
    getBrevoSmsSender() {
        return this.brevoSmsSender || null;
    }
    async sendBrevoEmail(email, otp) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': this.brevoApiKey,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: this.brevoEmailSenderName,
                    email: this.brevoEmailSenderEmail,
                },
                to: [{ email }],
                subject: 'Your OTP Code',
                textContent: `Your Upcheck verification code is ${otp}. It expires in 10 minutes.`,
            }),
        });
        if (!response.ok) {
            throw new common_1.BadRequestException('Failed to send email OTP');
        }
    }
    async sendBrevoSms(phone, otp) {
        const response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
            method: 'POST',
            headers: {
                'api-key': this.brevoApiKey,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: this.brevoSmsSender,
                recipient: phone,
                content: `Your Upcheck verification code is ${otp}. It expires in 10 minutes.`,
                type: 'transactional',
            }),
        });
        if (!response.ok) {
            throw new common_1.BadRequestException('Failed to send SMS OTP');
        }
    }
    async refreshToken(refreshToken) {
        const { data, error } = await this.supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });
        if (error) {
            throw new common_1.UnauthorizedException(error.message);
        }
        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
        };
    }
    async getUser(accessToken) {
        const { data, error } = await this.supabase.auth.getUser(accessToken);
        if (error) {
            throw new common_1.UnauthorizedException(error.message);
        }
        return data.user;
    }
    async logout(accessToken) {
        const { error } = await this.supabase.auth.admin.signOut(accessToken);
        if (error) {
            return { message: 'Logged out successfully' };
        }
        return { message: 'Logged out successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(otp_code_entity_1.OtpCode)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        otp_rate_limit_service_1.OtpRateLimitService])
], AuthService);
//# sourceMappingURL=auth.service.js.map