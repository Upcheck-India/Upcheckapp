import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleLoginDto } from './dto';
import { User } from './user.entity';
import { Profile } from '../profiles/profile.entity';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        // We don't need to pass constructor args if we verify only using client ID in verifyIdToken
        this.googleClient = new OAuth2Client(
            this.configService.get<string>('GOOGLE_CLIENT_ID_WEB'),
        );
    }

    // ─── Google Login ────────────────────────────────────────────────
    async googleLogin(googleLoginDto: GoogleLoginDto) {
        const { token } = googleLoginDto;

        let ticket;
        try {
            ticket = await this.googleClient.verifyIdToken({
                idToken: token,
                audience: [
                    this.configService.get<string>('GOOGLE_CLIENT_ID_WEB'),
                    this.configService.get<string>('GOOGLE_CLIENT_ID_IOS'),
                    this.configService.get<string>('GOOGLE_CLIENT_ID_ANDROID'),
                ].filter(Boolean) as string[],
            });
        } catch (error) {
            console.error('Error verifying Google token:', error);
            throw new UnauthorizedException('Invalid Google token');
        }

        const payload = ticket.getPayload();
        if (!payload) {
            throw new UnauthorizedException('Invalid Google token payload');
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            throw new BadRequestException('Email not found in Google token');
        }

        let user = await this.userRepository.findOne({ where: { email } });

        if (user) {
            // Update existing user with Google ID if not present
            if (!user.googleId) {
                user.googleId = googleId;
                user.avatarUrl = picture || user.avatarUrl;
                await this.userRepository.save(user);
            }
        } else {
            // Create new user
            user = this.userRepository.create({
                email,
                googleId,
                avatarUrl: picture,
                roles: [],
            });
            user = await this.userRepository.save(user);

            // Create Profile
            const profile = this.profileRepository.create({
                id: user.id,
                fullName: name || email.split('@')[0],
                languagePreference: 'en',
            });
            await this.profileRepository.save(profile);
        }

        const tokens = this.generateTokens(user);

        return {
            user,
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
        const { ...result } = user;
        return result;
    }

    // ─── Logout ──────────────────────────────────────────────────────
    async logout(token: string) {
        return { message: 'Logged out successfully' };
    }

    // ─── Helpers ─────────────────────────────────────────────────────
    private generateTokens(user: User) {
        const payload = { email: user.email, sub: user.id, roles: user.roles };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
        };
    }
}

