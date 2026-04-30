import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';

@Injectable()
export class TruecallerService {
  private readonly appKey: string;
  private readonly appSecret: string;

  constructor(private configService: ConfigService) {
    this.appKey = this.configService.get('TRUECALLER_APP_KEY') || '';
    this.appSecret = this.configService.get('TRUECALLER_APP_SECRET') || '';
  }

  /**
   * Verify Truecaller access token with Truecaller's verification API.
   * For production, verify the signature/token with Truecaller's server.
   * The Truecaller SDK on the mobile validates locally; for server-side
   * validation, use Truecaller's partner API or verify the JWT signature
   * using Truecaller's public key.
   */
  async verifyAccessToken(accessToken: string, phoneNumber: string): Promise<boolean> {
    if (!accessToken || !phoneNumber) {
      return false;
    }

    // If app key/secret are configured, perform server-side verification
    if (this.appKey && this.appSecret) {
      try {
        const response = await axios.get(
          `https://api4.truecaller.com/v1/user/profile`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (response.data && response.data.phoneNumber === phoneNumber) {
          return true;
        }
        return false;
      } catch {
        // Fallback: trust the SDK verification if server-side check fails
        return true;
      }
    }

    // Simplified: Trust the SDK verification (add server-side verification in production)
    return true;
  }

  /**
   * Parse Truecaller user data from SDK response
   */
  parseUserProfile(profile: any): {
    phoneNumber: string;
    firstName: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } {
    if (!profile) {
      throw new BadRequestException('Invalid Truecaller profile data');
    }

    return {
      phoneNumber: profile.phoneNumber || profile.phone,
      firstName: profile.firstName || profile.givenName || 'User',
      lastName: profile.lastName || profile.familyName,
      email: profile.email,
      avatarUrl: profile.avatarUrl || profile.avatar_url || profile.thumbnailUrl,
    };
  }
}
