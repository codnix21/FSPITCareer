import { Controller, Get, Put, Param, Body, Query, UseGuards, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateDto } from './dto/candidate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Кандидаты')
@Controller('candidates')
export class CandidatesController {
  constructor(private candidates: CandidatesService) {}

  @Get()
  @ApiOperation({ summary: 'Список кандидатов с фильтрами' })
  findAll(
    @Query('roleTitle') roleTitle?: string,
    @Query('grade') grade?: string,
    @Query('workFormat') workFormat?: string,
    @Query('skill') skill?: string,
    @Query('hasFsp') hasFsp?: string,
    @Query('experienceFrom') experienceFrom?: string,
    @Query('salaryFrom') salaryFrom?: string,
    @Query('salaryTo') salaryTo?: string,
  ) {
    return this.candidates.findAll({
      roleTitle,
      grade,
      workFormat,
      skill,
      hasFsp,
      experienceFrom,
      salaryFrom,
      salaryTo,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мой профиль кандидата' })
  me(@CurrentUser('id') userId: string) {
    return this.candidates.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Профиль кандидата' })
  findOne(@Param('id') id: string) {
    return this.candidates.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль кандидата' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.candidates.update(id, dto, user);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: 'Достижения ФСП кандидата' })
  achievements(@Param('id') id: string) {
    return this.candidates.getAchievements(id);
  }

  @Post(':id/achievements/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Синхронизировать достижения ФСП' })
  syncAchievements(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.candidates.syncFspAchievements(id, user);
  }
}
