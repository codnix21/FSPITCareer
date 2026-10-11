import { Module } from '@nestjs/common';
import { CandidateCategoryService } from './candidate-category.service';
import { TaxonomyController } from './taxonomy.controller';

@Module({
  controllers: [TaxonomyController],
  providers: [CandidateCategoryService],
  exports: [CandidateCategoryService],
})
export class TaxonomyModule {}
