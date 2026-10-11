import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from '../reference/reference.service';

@ApiTags('Навыки')
@Controller('skills')
export class SkillsController {
  constructor(private reference: ReferenceService) {}

  @Get()
  @ApiOperation({ summary: 'Справочник технологий (совместимость)' })
  async list(@Query('q') q?: string, @Query('limit') limit?: string) {
    const res = await this.reference.searchSkills(q, Number(limit) || 100);
    return {
      total: res.total,
      items: res.items.map((i) => ({
        id: i.id,
        name: i.label,
        category: i.meta?.category ?? null,
        aliases: i.meta?.aliases ?? [],
      })),
      truncated: res.truncated,
    };
  }
}
