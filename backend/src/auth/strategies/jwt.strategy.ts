import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const publicKeyPath = path.join(process.cwd(), 'secrets', 'public.pem');
        let publicKey: Buffer;
        try {
            publicKey = fs.readFileSync(publicKeyPath);
        } catch (error) {
            console.error(`Failed to load public key at ${publicKeyPath}`, error);
            throw new Error('Internal server error: public key not found');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: publicKey,
            algorithms: ['RS256'],
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.sub);

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            userId: payload.sub,
            email: payload.email,
        };
    }
}
