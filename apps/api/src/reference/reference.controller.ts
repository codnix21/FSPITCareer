import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';
import { ExternalReferenceService } from './external-reference.service';

@ApiTags('Справочники')
@Controller('reference')
export class ReferenceController {
  constructor(
    private readonly reference: ReferenceService,
    private readonly external: ExternalReferenceService,
  ) {}

  @Get('skills')
  @ApiOperation({ summary: 'Локальный поиск навыков (legacy / backward compatibility)' })
  skills(@Query('q') q?: string, @Query('limit') limit?: string, @Query('category') category?: string) {
    return this.reference.searchSkills(q, Number(limit) || 20, category);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Локальный поиск городов (legacy)' })
  cities(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.reference.searchCities(q, Number(limit) || 20);
  }

  @Get('positions')
  @ApiOperation({ summary: 'Локальный поиск должностей (legacy)' })
  positions(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.reference.searchPositions(q, Number(limit) || 20);
  }

  @Get('companies')
  @ApiOperation({ summary: 'Локальный поиск компаний' })
  companies(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.reference.searchCompanies(q, Number(limit) || 20);
  }

  @Get('education')
  @ApiOperation({ summary: 'Уровни образования (локальный enum)' })
  education(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.reference.searchEducation(q, Number(limit) || 20);
  }

  @Get('grades')
  @ApiOperation({ summary: 'Уровни специалистов' })
  grades() {
    return this.reference.listGrades();
  }

  @Get('work-formats')
  @ApiOperation({ summary: 'Форматы работы' })
  workFormats() {
    return this.reference.listWorkFormats();
  }

  @Get('external/skills')
  @ApiOperation({ summary: 'Внешние подсказки навыков (HeadHunter)' })
  externalSkills(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.external.searchSkills(q || '', Number(limit) || 10);
  }

  @Get('external/positions')
  @ApiOperation({ summary: 'Внешние подсказки должностей (HeadHunter)' })
  externalPositions(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.external.searchPositions(q || '', Number(limit) || 10);
  }

  @Get('external/cities')
  @ApiOperation({ summary: 'Внешние подсказки городов / регионов (HeadHunter areas)' })
  externalCities(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.external.searchCities(q || '', Number(limit) || 10);
  }

  @Get('external/companies')
  @ApiOperation({ summary: 'Внешние подсказки компаний (HeadHunter)' })
  externalCompanies(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.external.searchCompanies(q || '', Number(limit) || 10);
  }

  @Get('external/education-institutions')
  @ApiOperation({ summary: 'Внешние подсказки учебных заведений (HeadHunter)' })
  externalEducationInstitutions(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.external.searchEducationInstitutions(q || '', Number(limit) || 10);
  }
}
