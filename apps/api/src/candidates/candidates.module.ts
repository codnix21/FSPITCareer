import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { ReferenceModule } from '../reference/reference.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { EmailModule } from '../email/email.module';
import { FspModule } from '../fsp/fsp.module';

@Module({
  imports: [ReferenceModule, PrivacyModule, TaxonomyModule, EmailModule, FspModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
