import { Body, Controller, Get, Header, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CandidatesService } from '../candidates/candidates.service';
import { VacanciesService } from '../vacancies/vacancies.service';
import { FspService } from '../fsp/fsp.service';

class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('Администрирование')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private admin: AdminService,
    private candidates: CandidatesService,
    private vacancies: VacanciesService,
    private fsp: FspService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Статистика платформы' })
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Пользователи' })
  users() {
    return this.admin.users();
  }

  @Patch('users/:id/active')
  @ApiOperation({ summary: 'Включить / отключить пользователя' })
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.admin.setUserActive(id, dto.isActive);
  }

  @Get('companies')
  @ApiOperation({ summary: 'Компании' })
  companies() {
    return this.admin.companies();
  }

  @Get('candidates')
  @ApiOperation({ summary: 'Кандидаты' })
  candidatesList() {
    return this.candidates.findAll();
  }

  @Get('vacancies')
  @ApiOperation({ summary: 'Вакансии' })
  vacanciesList() {
    return this.vacancies.findAll();
  }

  @Post('vacancies/:id/close')
  @ApiOperation({ summary: 'Закрыть вакансию (админ)' })
  closeVacancy(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.vacancies.close(id, user);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Достижения ФСП' })
  achievements() {
    return this.fsp.listAchievements();
  }

  @Get('export')
  @ApiOperation({ summary: 'Экспорт CSV (users|candidates|vacancies|offers)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Query('entity') entity: 'users' | 'candidates' | 'vacancies' | 'offers' = 'users',
    @Res() res: Response,
  ) {
    const allowed = ['users', 'candidates', 'vacancies', 'offers'] as const;
    const key = allowed.includes(entity as any) ? entity : 'users';
    const csv = '\uFEFF' + (await this.admin.exportCsv(key));
    res.setHeader('Content-Disposition', `attachment; filename="${key}.csv"`);
    res.send(csv);
  }
}
