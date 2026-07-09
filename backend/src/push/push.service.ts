import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { User } from '../auth/user.entity';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Stores per-user Expo push tokens and delivers notifications through the
 * Expo push service. Token persistence lives on the `users` row
 * (`push_token`); delivery is best-effort and never throws into the caller.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async registerToken(
    userId: string,
    token: string,
  ): Promise<{ success: true }> {
    await this.usersRepository.update(userId, { pushToken: token });
    return { success: true };
  }

  async clearToken(userId: string): Promise<{ success: true }> {
    await this.usersRepository.update(userId, { pushToken: null });
    return { success: true };
  }

  /**
   * Send a push to a user if they have a registered Expo token.
   * Returns true if a message was dispatched to Expo (not a delivery receipt).
   */
  async sendToUser(
    userId: string,
    notification: { title: string; body: string; data?: Record<string, any> },
  ): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    const token = user?.pushToken;
    if (!token) return false;

    try {
      await axios.post(
        EXPO_PUSH_URL,
        {
          to: token,
          title: notification.title,
          body: notification.body,
          data: notification.data ?? {},
          sound: 'default',
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
      );
      return true;
    } catch (err: any) {
      this.logger.warn(
        `Expo push to user ${userId} failed: ${err?.message ?? err}`,
      );
      return false;
    }
  }
}
