import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Grade } from '@prisma/client';
import { CandidateCategoryService } from './candidate-category.service';

@ApiTags('Справочники — категории')
@Controller('reference')
export class TaxonomyController {
  constructor(private categoryService: CandidateCategoryService) {}

  @Get('industries')
  @ApiOperation({ summary: 'Отрасли' })
  industries() {
    return this.categoryService.listIndustries().then((items) => ({ total: items.length, items }));
  }

  @Get('specializations')
  @ApiOperation({ summary: 'Специализации' })
  specializations(@Query('industryId') industryId?: string) {
    return this.categoryService.listSpecializations(industryId).then((items) => ({ total: items.length, items }));
  }

  @Get('categories')
  @ApiOperation({ summary: 'Категории кандидатов' })
  listCategories(@Query('specializationId') specializationId?: string, @Query('grade') grade?: Grade) {
    return this.categoryService.listCategories(specializationId, grade).then((items) => ({ total: items.length, items }));
  }
}
