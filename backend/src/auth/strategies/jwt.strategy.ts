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
        // Load public key: prefer env var (for cloud deployments like Render), fallback to file
        const envPublicKey = process.env.JWT_PUBLIC_KEY;
        let publicKey: string | Buffer;
        if (envPublicKey) {
            publicKey = envPublicKey.replace(/\\n/g, '\n');
        } else {
            const publicKeyPath = path.join(process.cwd(), 'secrets', 'public.pem');
            try {
                publicKey = fs.readFileSync(publicKeyPath);
            } catch (error) {
                console.error(`Failed to load public key at ${publicKeyPath}`, error);
                throw new Error('Internal server error: public key not found. Set JWT_PUBLIC_KEY env var or provide secrets/public.pem');
            }
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
            id: payload.sub,
            email: payload.email,
        };
    }
}
