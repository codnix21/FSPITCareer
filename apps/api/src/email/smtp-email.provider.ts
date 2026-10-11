import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, VerificationEmailPayload } from './email.provider';

/**
 * Production SMTP adapter stub — wire nodemailer/transporter via env when SMTP is configured.
 * Currently logs that SMTP mode is selected; implement transport when SMTP_* env present.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger('SmtpEmailProvider');

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(`SMTP_HOST missing — falling back to log for ${payload.to}`);
      this.logger.log(`[SMTP FALLBACK] Verify URL for ${payload.to}: ${payload.verifyUrl}`);
      return;
    }
    // Real SMTP can be wired here (nodemailer). For Wave B we keep adapter boundary ready.
    this.logger.log(`[SMTP] Would send verification to ${payload.to} via ${host}`);
    this.logger.log(`[SMTP] Verify URL: ${payload.verifyUrl}`);
  }
}
