import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, VerifyOtpDto, SendOtpDto } from './dto';
import { OtpCode } from './otp-code.entity';
import { User } from './user.entity';
import { Profile } from '../profiles/profile.entity';
import { OtpRateLimitService } from './otp-rate-limit.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(OtpCode)
        private otpRepository: Repository<OtpCode>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        private otpRateLimitService: OtpRateLimitService,
        private mailService: MailService,
        private jwtService: JwtService,
    ) { }

    // ─── Registration ────────────────────────────────────────────────
    async register(registerDto: RegisterDto) {
        const { email, password, fullName } = registerDto;

        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({
            email,
            passwordHash: hashedPassword,
            roles: [],
        });

        const savedUser = await this.userRepository.save(user);

        // Create Profile
        const profile = this.profileRepository.create({
            id: savedUser.id,
            fullName: fullName,
            // default values
            languagePreference: 'en',
        });
        await this.profileRepository.save(profile);

        const tokens = this.generateTokens(savedUser);

        return {
            message: 'Registration successful.',
            user: { ...savedUser, passwordHash: undefined },
            ...tokens,
        };
    }

    // ─── Password Login ──────────────────────────────────────────────
    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            // User might be OTP-only or migrated without password
            throw new UnauthorizedException('Invalid credentials. Try logging in with OTP.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = this.generateTokens(user);

        return {
            user: { ...user, passwordHash: undefined },
            ...tokens,
        };
    }

    // ─── Send OTP ────────────────────────────────────────────────────
    async sendOtp(sendOtpDto: SendOtpDto) {
        const { email, phone } = sendOtpDto;

        if (!email && !phone) {
            throw new BadRequestException('Email or phone is required');
        }

        if (!(await this.otpRateLimitService.checkDailyLimit(email, phone))) {
            throw new BadRequestException('Daily OTP limit exceeded. Please try again tomorrow.');
        }

        if (!(await this.otpRateLimitService.checkResendCooldown(email, phone))) {
            throw new BadRequestException('Please wait before requesting another OTP.');
        }

        const otp = this.generateOtpCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        if (email) {
            await this.mailService.sendOtpEmail(email, otp);
            await this.otpRepository.save(
                this.otpRepository.create({ email, code: otp, expiresAt }),
            );
        }

        if (phone) {
            throw new BadRequestException('SMS OTP is not yet supported');
        }

        return { message: 'OTP sent successfully.' };
    }

    // ─── Verify OTP ──────────────────────────────────────────────────
    async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ verified: boolean; message: string }> {
        const { email, phone, token } = verifyOtpDto;

        if (!email && !phone) {
            throw new BadRequestException('Email or phone is required');
        }

        const latestOtp = await this.otpRepository.findOne({
            where: email ? { email } : { phone },
            order: { createdAt: 'DESC' },
        });

        if (!latestOtp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (latestOtp.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('OTP expired');
        }

        if (latestOtp.verifiedAt) {
            throw new UnauthorizedException('OTP already used');
        }

        if (latestOtp.failedAttempts >= 5) {
            throw new UnauthorizedException('Too many failed attempts. Please request a new OTP.');
        }

        if (latestOtp.code !== token) {
            latestOtp.failedAttempts += 1;
            await this.otpRepository.save(latestOtp);
            throw new UnauthorizedException('Invalid OTP');
        }

        latestOtp.verifiedAt = new Date();
        await this.otpRepository.save(latestOtp);

        return { verified: true, message: 'OTP verified successfully.' };
    }

    // ─── Login With OTP ──────────────────────────────────────────────
    async loginWithOtp(verifyOtpDto: VerifyOtpDto) {
        // Step 1: Verify the OTP
        await this.verifyOtp(verifyOtpDto);

        const { email } = verifyOtpDto;
        if (!email) {
            throw new BadRequestException('Email is required for OTP login');
        }

        // Step 2: Find or create the user
        let user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            // Create a new user (OTP-only user for now)
            user = this.userRepository.create({
                email,
                roles: [],
            });
            user = await this.userRepository.save(user);

            // Create Profile for new OTP user
            const profile = this.profileRepository.create({
                id: user.id,
                fullName: email.split('@')[0], // Default name from email part
                languagePreference: 'en',
            });
            await this.profileRepository.save(profile);
        }

        const tokens = this.generateTokens(user);

        return {
            user: { ...user, passwordHash: undefined },
            ...tokens,
        };
    }

    // ─── Token Refresh ───────────────────────────────────────────────
    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken);
            const user = await this.userRepository.findOne({ where: { id: payload.sub } });

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // In a real app, verify 'refresh_token' version or similar to allow revocation
            const tokens = this.generateTokens(user);
            return tokens;
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // ─── Get User ────────────────────────────────────────────────────
    async getUser(id: string) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...result } = user;
        return result;
    }

    // ─── Logout ──────────────────────────────────────────────────────
    async logout(token: string) {
        // In stateless JWT, we can't really "logout" without a blacklist.
        // For now, client just discards token.
        return { message: 'Logged out successfully' };
    }

    // ─── Helpers ─────────────────────────────────────────────────────
    private generateOtpCode(): string {
        // Simple numeric 6-digit OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private generateTokens(user: User) {
        const payload = { email: user.email, sub: user.id, roles: user.roles };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '15m' }), // Short lived
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), // Long lived
        };
    }
}
