import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ContactRevealService } from './contact-reveal.service';

@Global()
@Module({
  providers: [AuditService, ContactRevealService],
  exports: [AuditService, ContactRevealService],
})
export class PrivacyModule {}
