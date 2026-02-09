import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockVerify = jest.fn().mockResolvedValue(true);

(nodemailer.createTransport as jest.Mock).mockReturnValue({
  sendMail: mockSendMail,
  verify: mockVerify,
});

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const configMap: Record<string, string> = {
      SMTP_HOST: 'smtp-relay.brevo.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'test@smtp-brevo.com',
      SMTP_PASS: 'test-smtp-pass',
      SMTP_SENDER_NAME: 'Upcheck',
      SMTP_SENDER_EMAIL: 'noreply@upcheck.in',
    };
    return configMap[key] || '';
  }),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create nodemailer transport with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@smtp-brevo.com',
          pass: 'test-smtp-pass',
        },
      });
    });
  });

  describe('sendOtpEmail', () => {
    it('should send email with correct parameters', async () => {
      await service.sendOtpEmail('user@example.com', '123456');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.from).toBe('"Upcheck" <noreply@upcheck.in>');
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toBe('Your OTP Code');
      expect(callArgs.text).toContain('123456');
      expect(callArgs.text).toContain('10 minutes');
    });

    it('should include OTP in HTML body', async () => {
      await service.sendOtpEmail('user@example.com', '654321');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('654321');
    });

    it('should throw if sendMail fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(
        service.sendOtpEmail('user@example.com', '123456'),
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('verifyConnection', () => {
    it('should return true when connection is valid', async () => {
      mockVerify.mockResolvedValueOnce(true);
      const result = await service.verifyConnection();
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await service.verifyConnection();
      expect(result).toBe(false);
    });
  });
});
