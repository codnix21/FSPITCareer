import { Module } from '@nestjs/common';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';
import { ExternalReferenceService } from './external-reference.service';
import { HeadHunterReferenceProvider } from './providers/headhunter.provider';
import { REFERENCE_PROVIDER } from './providers/reference-provider';
import { SkillPersistenceService } from './skill-persistence.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReferenceController],
  providers: [
    ReferenceService,
    ExternalReferenceService,
    SkillPersistenceService,
    HeadHunterReferenceProvider,
    {
      provide: REFERENCE_PROVIDER,
      useExisting: HeadHunterReferenceProvider,
    },
  ],
  exports: [ReferenceService, ExternalReferenceService, SkillPersistenceService],
})
export class ReferenceModule {}
