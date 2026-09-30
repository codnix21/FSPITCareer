import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Навыки')
@Controller('skills')
export class SkillsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Справочник технологий' })
  async list(@Query('q') q?: string) {
    const items = await this.prisma.skill.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: 100,
    });
    return { total: items.length, items };
  }
}
