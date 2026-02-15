import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiInstance: TransactionalEmailsApi;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('BREVO_API_KEY');
    this.apiInstance = new TransactionalEmailsApi();
    this.apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  async sendVerificationEmail(email: string, token: string, name?: string) {
    const appName = this.configService.get('APP_NAME', 'Your App');
    const verificationUrl = `${this.configService.get('MOBILE_DEEP_LINK', 'myapp://verify-email')}?token=${token}`;

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.sender = {
      email: this.configService.get('EMAIL_FROM'),
      name: this.configService.get('EMAIL_FROM_NAME', appName),
    };
    sendSmtpEmail.subject = `Verify your email address - ${appName}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background-color: #007bff; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
            }
            .code-box {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-family: monospace;
              word-break: break-all;
              font-size: 14px;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px; 
              color: #666;
              text-align: center;
            }
            .security-note {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 20px 0;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
            </div>
            <h2>Welcome to ${appName}! 🎉</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for signing up! We're excited to have you on board. To get started, please verify your email address by tapping the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or tap this link in your mobile device:</p>
            <div class="code-box">${verificationUrl}</div>
            <div class="security-note">
              <strong>⏱️ This verification link will expire in 24 hours.</strong>
            </div>
            <div class="footer">
              <p>If you didn't create an account with ${appName}, you can safely ignore this email.</p>
              <p>Need help? Contact our support team anytime.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string, name?: string) {
    const appName = this.configService.get('APP_NAME', 'Your App');
    const resetUrl = `${this.configService.get('MOBILE_DEEP_LINK', 'myapp://reset-password')}?token=${token}`;

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.sender = {
      email: this.configService.get('EMAIL_FROM'),
      name: this.configService.get('EMAIL_FROM_NAME', appName),
    };
    sendSmtpEmail.subject = `Reset your password - ${appName}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
            }
            .button { 
              display: inline-block; 
              padding: 14px 32px; 
              background-color: #dc3545; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px;
              margin: 20px 0;
              font-weight: 600;
            }
            .code-box {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              font-family: monospace;
              word-break: break-all;
              font-size: 14px;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px; 
              color: #666;
              text-align: center;
            }
            .security-note {
              background-color: #f8d7da;
              border-left: 4px solid #dc3545;
              padding: 12px;
              margin: 20px 0;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
            </div>
            <h2>Password Reset Request 🔒</h2>
            <p>Hi ${name || 'there'},</p>
            <p>We received a request to reset your password. If you made this request, tap the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or tap this link in your mobile device:</p>
            <div class="code-box">${resetUrl}</div>
            <div class="security-note">
              <strong>⏱️ This link will expire in 1 hour for security reasons.</strong>
            </div>
            <div class="footer">
              <p><strong>If you didn't request a password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
              <p>For security, we recommend changing your password regularly.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email: string, name?: string) {
    const appName = this.configService.get('APP_NAME', 'Your App');

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.sender = {
      email: this.configService.get('EMAIL_FROM'),
      name: this.configService.get('EMAIL_FROM_NAME', appName),
    };
    sendSmtpEmail.subject = `Welcome to ${appName}! 🎉`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
            }
            h2 {
              color: #333;
              margin-bottom: 10px;
            }
            .success-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px; 
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
            </div>
            <div class="success-icon">✅</div>
            <h2>You're All Set!</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Your email has been verified successfully! Welcome to ${appName}. We're thrilled to have you with us.</p>
            <p>You can now access all the features of our app. If you have any questions or need assistance, our support team is here to help.</p>
            <div class="footer">
              <p>Happy exploring! 🚀</p>
              <p>Need help? Contact our support team anytime.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${email}:`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  async sendPasswordChangedNotification(email: string, name?: string) {
    const appName = this.configService.get('APP_NAME', 'Your App');

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: name || email }];
    sendSmtpEmail.sender = {
      email: this.configService.get('EMAIL_FROM'),
      name: this.configService.get('EMAIL_FROM_NAME', appName),
    };
    sendSmtpEmail.subject = `Your password has been changed - ${appName}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              padding: 40px 30px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #007bff;
            }
            .security-alert {
              background-color: #d1ecf1;
              border-left: 4px solid #17a2b8;
              padding: 15px;
              margin: 20px 0;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px; 
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
            </div>
            <h2>Password Changed Successfully 🔐</h2>
            <p>Hi ${name || 'there'},</p>
            <p>This is a confirmation that your password was changed on ${new Date().toLocaleString()}.</p>
            <div class="security-alert">
              <strong>⚠️ If you did not make this change:</strong><br>
              Please contact our support team immediately as your account may be compromised.
            </div>
            <div class="footer">
              <p>This is an automated security notification.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Password changed notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending password changed notification to ${email}:`, error);
    }
  }
}
