import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.provider';
import { ConsoleEmailProvider } from './console-email.provider';
import { SmtpEmailProvider } from './smtp-email.provider';
import { EmailVerificationService } from './email-verification.service';

const providerFactory = {
  provide: EMAIL_PROVIDER,
  useFactory: () => {
    const mode = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
    if (mode === 'smtp') return new SmtpEmailProvider();
    return new ConsoleEmailProvider();
  },
};

@Module({
  providers: [providerFactory, EmailVerificationService],
  exports: [EmailVerificationService, EMAIL_PROVIDER],
})
export class EmailModule {}
