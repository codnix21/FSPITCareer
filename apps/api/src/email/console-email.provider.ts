import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, VerificationEmailPayload } from './email.provider';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    this.logger.log(
      `[DEV MAIL] To: ${payload.to} | Verify: ${payload.verifyUrl} | Expires: ${payload.expiresAt.toISOString()}`,
    );
  }
}
