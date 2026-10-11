import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsAdminController } from './assessments-admin.controller';
import { AssessmentsService } from './assessments.service';
import { ScoringService } from './scoring.service';
import { EmailModule } from '../email/email.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
  imports: [EmailModule, TaxonomyModule, PrivacyModule],
  controllers: [AssessmentsController, AssessmentsAdminController],
  providers: [AssessmentsService, ScoringService],
  exports: [AssessmentsService, ScoringService],
})
export class AssessmentsModule {}
