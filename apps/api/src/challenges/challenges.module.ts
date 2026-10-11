import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesAdminController } from './challenges-admin.controller';
import { ChallengesService } from './challenges.service';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
  imports: [PrivacyModule],
  controllers: [ChallengesController, ChallengesAdminController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
