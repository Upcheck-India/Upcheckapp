import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY', '');
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      this.logger.warn(
        'BREVO_API_KEY not set — emails will be logged but not sent.',
      );
    } else {
      this.logger.log('Brevo HTTP API email service ready.');
    }
  }

  private get senderEmail(): string {
    return this.configService.get('SMTP_SENDER_EMAIL', 'noreply@upcheck.in');
  }

  private get senderName(): string {
    return this.configService.get('SMTP_SENDER_NAME', 'Upcheck');
  }

  private get appName(): string {
    return this.configService.get('APP_NAME', 'Upcheck');
  }

  private async postToBrevo(body: unknown): Promise<Response> {
    return fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Sends via the Brevo HTTP API. Throws on failure (network error, or a 4xx/5xx
   * after one bounded retry on 5xx) so callers can surface the failure instead of
   * silently reporting success — see AUDIT id 111. Recipient address is never
   * logged (PII) — only subject/outcome.
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not sent (BREVO_API_KEY missing): ${subject}`);
      return;
    }

    const body = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    let res: Response;
    try {
      res = await this.postToBrevo(body);
      if (!res.ok && res.status >= 500) {
        // ponytail: one bounded retry for transient 5xx, no queue/backoff.
        res = await this.postToBrevo(body);
      }
    } catch (err: any) {
      this.logger.error(`Brevo API fetch failed (${subject}): ${err.message}`);
      throw err;
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Brevo API error ${res.status} (${subject}): ${text}`);
      throw new Error(`Brevo API error ${res.status}`);
    }
    this.logger.log(`Email sent via Brevo API: ${subject}`);
  }

  // ponytail: sendVerificationEmail/sendPasswordResetEmail/sendWelcomeEmail/
  // sendPasswordChangedNotification/sendOtpEmail removed — zero callers, grep-
  // confirmed (AUDIT id 114). Auth flows use supabaseAuthService's own same-named
  // methods instead. sendInviteEmail below is the only live path.
  async sendInviteEmail(toEmail: string, inviterName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #1565C0; }
            .badge { display: inline-block; background: #e3f2fd; color: #1565C0; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
            .cta { text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${this.appName}</div>
              <div class="badge">You've been invited!</div>
            </div>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> thinks you'd love <strong>${this.appName}</strong> — the smart aquaculture management app for shrimp and fish farmers.</p>
            <p>With ${this.appName} you can:</p>
            <ul>
              <li>Track pond water quality in real time</li>
              <li>Monitor feeding, sampling, and harvest data</li>
              <li>Get disease alerts and smart recommendations</li>
              <li>Manage multiple farms and ponds in one place</li>
            </ul>
            <div class="cta">
              <p style="margin:0; font-weight:600; color:#1565C0;">🚀 We're in early access — stay tuned!</p>
              <p style="margin:8px 0 0; font-size:14px; color:#555;">${inviterName} has notified us that you're interested. We'll reach out as soon as the app is fully launched.</p>
            </div>
            <div class="footer">
              <p>You received this because ${inviterName} invited you to join ${this.appName}.</p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(
      toEmail,
      `${inviterName} invited you to join ${this.appName}!`,
      html,
    );
  }
}
