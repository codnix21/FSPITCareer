import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CandidatesModule } from '../candidates/candidates.module';
import { VacanciesModule } from '../vacancies/vacancies.module';
import { FspModule } from '../fsp/fsp.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';

@Module({
  imports: [CandidatesModule, VacanciesModule, FspModule, TaxonomyModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
