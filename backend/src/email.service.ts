import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      this.logger.warn('SMTP_USER or SMTP_PASS not set — emails will be logged but not sent.');
      this.transporter = null as any;
      return;
    }

    this.isConfigured = true;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp-relay.brevo.com'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10),
      // For Brevo on port 587: secure=false + STARTTLS (default). For port 465: secure=true.
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: smtpUser,   // Your Brevo account login email
        pass: smtpPass,   // Your Brevo SMTP API key (NOT account password)
      },
      // Do NOT use pool:true — causes persistent connection issues on Render/Brevo
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false, // Brevo occasionally uses intermediate certs
      },
    });

    // Verify connection on startup (async, don't block)
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection established successfully');
    } catch (err: any) {
      this.logger.warn(`SMTP connection failed: ${err.message}. Check SMTP_USER / SMTP_PASS in env vars.`);
      this.isConfigured = false;
    }
  }

  private async sendMail(options: nodemailer.SendMailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): ${options.subject}`);
      return false;
    }
    try {
      await this.transporter.sendMail(options);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email "${options.subject}" to ${options.to}: ${err.message}`);
      return false;
    }
  }

  private get senderEmail(): string {
    return this.configService.get('SMTP_SENDER_EMAIL', this.configService.get('EMAIL_FROM', 'noreply@upcheck.in'));
  }

  private get senderName(): string {
    return this.configService.get('SMTP_SENDER_NAME', this.configService.get('EMAIL_FROM_NAME', 'Upcheck'));
  }

  private get appName(): string {
    return this.configService.get('APP_NAME', 'Upcheck');
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.sendMail({
      from: `"${this.senderName}" <${this.senderEmail}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }

  async sendVerificationEmail(email: string, token: string, name?: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL', 'upcheck://verify-email')}?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #007bff; }
            .button { display: inline-block; padding: 14px 32px; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .code-box { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; word-break: break-all; font-size: 14px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
            .security-note { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">${this.appName}</div></div>
            <h2>Welcome to ${this.appName}! 🎉</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for signing up! Please verify your email address by tapping the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or tap this link:</p>
            <div class="code-box">${verificationUrl}</div>
            <div class="security-note"><strong>⏱️ This verification link will expire in 24 hours.</strong></div>
            <div class="footer">
              <p>If you didn't create an account with ${this.appName}, you can safely ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(email, `Verify your email address - ${this.appName}`, html);
  }

  async sendPasswordResetEmail(email: string, token: string, name?: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'upcheck://reset-password')}?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #007bff; }
            .button { display: inline-block; padding: 14px 32px; background-color: #dc3545; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .code-box { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-family: monospace; word-break: break-all; font-size: 14px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
            .security-note { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">${this.appName}</div></div>
            <h2>Password Reset Request 🔒</h2>
            <p>Hi ${name || 'there'},</p>
            <p>We received a request to reset your password. Tap the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or tap this link:</p>
            <div class="code-box">${resetUrl}</div>
            <div class="security-note"><strong>⏱️ This link will expire in 1 hour for security reasons.</strong></div>
            <div class="footer">
              <p><strong>If you didn't request a password reset, please ignore this email.</strong></p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(email, `Reset your password - ${this.appName}`, html);
  }

  async sendWelcomeEmail(email: string, name?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #007bff; }
            .success-icon { text-align: center; font-size: 48px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">${this.appName}</div></div>
            <div class="success-icon">✅</div>
            <h2>You're All Set!</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Your email has been verified successfully! Welcome to ${this.appName}. We're thrilled to have you with us.</p>
            <p>You can now access all the features of our app.</p>
            <div class="footer">
              <p>Happy exploring! 🚀</p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(email, `Welcome to ${this.appName}! 🎉`, html);
  }

  async sendPasswordChangedNotification(email: string, name?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #007bff; }
            .security-alert { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">${this.appName}</div></div>
            <h2>Password Changed Successfully 🔐</h2>
            <p>Hi ${name || 'there'},</p>
            <p>This is a confirmation that your password was changed on ${new Date().toLocaleString()}.</p>
            <div class="security-alert">
              <strong>⚠️ If you did not make this change:</strong><br>
              Please contact our support team immediately as your account may be compromised.
            </div>
            <div class="footer">
              <p>This is an automated security notification.</p>
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(email, `Your password has been changed - ${this.appName}`, html);
  }

  async sendOtpEmail(email: string, code: string, name?: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; text-align: center; }
            .header { margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #007bff; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 30px 0; background: #f8f9fa; padding: 20px; border-radius: 10px; display: inline-block; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><div class="logo">${this.appName}</div></div>
            <h2>Verification Code 🔐</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Use the following code to complete your login/verification:</p>
            <div class="otp-code">${code}</div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>`;

    await this.sendEmail(email, `Your Verification Code - ${this.appName}`, html);
  }
}
