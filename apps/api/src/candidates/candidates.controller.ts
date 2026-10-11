import { Controller, Get, Put, Param, Body, Query, UseGuards, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateDto } from './dto/candidate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Кандидаты')
@Controller('candidates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CandidatesController {
  constructor(private candidates: CandidatesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Список кандидатов (публичные профили)' })
  findAll(
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('roleTitle') roleTitle?: string,
    @Query('grade') grade?: string,
    @Query('workFormat') workFormat?: string,
    @Query('skill') skill?: string,
    @Query('hasFsp') hasFsp?: string,
    @Query('experienceFrom') experienceFrom?: string,
    @Query('salaryFrom') salaryFrom?: string,
    @Query('salaryTo') salaryTo?: string,
    @Query('specializationId') specializationId?: string,
    @Query('industryId') industryId?: string,
  ) {
    return this.candidates.findAll(
      {
        roleTitle,
        grade,
        workFormat,
        skill,
        hasFsp,
        experienceFrom,
        salaryFrom,
        salaryTo,
        specializationId,
        industryId,
      },
      user,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Мой профиль кандидата' })
  me(@CurrentUser('id') userId: string) {
    return this.candidates.findByUserId(userId);
  }

  @Get('me/completion')
  @ApiOperation({ summary: 'Статус заполнения профиля кандидата' })
  completion(@CurrentUser('id') userId: string) {
    return this.candidates.getCompletion(userId);
  }

  @Get(':id/contact')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Контакты кандидата (только после ACCEPTED offer)' })
  contact(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.candidates.getContact(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Профиль кандидата (own / public по роли)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.candidates.findOneForViewer(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить профиль кандидата' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: { id: string; role: UserRole; emailVerified?: boolean },
  ) {
    return this.candidates.update(id, dto, user);
  }

  @Get(':id/achievements')
  @ApiOperation({ summary: 'Достижения ФСП кандидата' })
  achievements(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.candidates.getAchievements(id, user);
  }

  @Post(':id/achievements/sync')
  @ApiOperation({ summary: 'Синхронизировать достижения ФСП' })
  syncAchievements(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.candidates.syncFspAchievements(id, user);
  }
}
