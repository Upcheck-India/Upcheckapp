import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private senderName: string;
    private senderEmail: string;

    constructor(private configService: ConfigService) {
        this.senderName = this.configService.get<string>('SMTP_SENDER_NAME') || 'Upcheck';
        this.senderEmail = this.configService.get<string>('SMTP_SENDER_EMAIL') || '';

        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST') || 'smtp-relay.brevo.com',
            port: Number(this.configService.get<string>('SMTP_PORT') || '587'),
            secure: this.configService.get<string>('SMTP_SECURE') === 'true',
            auth: {
                user: this.configService.get<string>('SMTP_USER') || '',
                pass: this.configService.get<string>('SMTP_PASS') || '',
            },
        });
    }

    async sendOtpEmail(to: string, otp: string): Promise<void> {
        console.log(`[MailService] Attempting to send OTP to ${to}...`);
        try {
            const info = await this.transporter.sendMail({
                from: `"${this.senderName}" <${this.senderEmail}>`,
                to,
                subject: 'Your OTP Code',
                text: `Your Upcheck verification code is ${otp}. It expires in 10 minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                        <h2 style="color: #1a73e8;">Upcheck Verification</h2>
                        <p>Your verification code is:</p>
                        <div style="background: #f0f4ff; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1a73e8;">${otp}</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
                    </div>
                `,
            });
            console.log(`[MailService] ✅ Email sent successfully. MessageId: ${info.messageId}`);
        } catch (error) {
            console.error(`[MailService] ❌ Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch {
            return false;
        }
    }
}
