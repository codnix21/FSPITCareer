import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VacanciesService } from './vacancies.service';
import { CreateVacancyDto, UpdateVacancyDto } from './dto/vacancy.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, VacancyStatus } from '@prisma/client';

@ApiTags('Вакансии')
@Controller('vacancies')
export class VacanciesController {
  constructor(private vacancies: VacanciesService) {}

  @Get()
  @ApiOperation({ summary: 'Список вакансий' })
  findAll(@Query('status') status?: VacancyStatus, @Query('companyId') companyId?: string) {
    return this.vacancies.findAll({ status, companyId });
  }

  @Get('employer/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вакансии моей компании' })
  mine(@CurrentUser('id') userId: string) {
    return this.vacancies.mine(userId);
  }

  @Get('employer/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика работодателя' })
  stats(@CurrentUser('id') userId: string) {
    return this.vacancies.employerStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Вакансия по id' })
  findOne(@Param('id') id: string) {
    return this.vacancies.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать вакансию' })
  create(@Body() dto: CreateVacancyDto, @CurrentUser('id') userId: string) {
    return this.vacancies.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить вакансию' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVacancyDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.vacancies.update(id, dto, user);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Закрыть вакансию' })
  close(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.vacancies.close(id, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить вакансию' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.vacancies.remove(id, user);
  }
}
