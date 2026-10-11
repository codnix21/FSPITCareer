import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto } from './dto/application.dto';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Отклики')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private applications: ApplicationsService) {}

  @Post('applications')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Откликнуться на вакансию' })
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: AuthUser) {
    return this.applications.create(dto, user);
  }

  @Get('applications/me')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Мои отклики' })
  mine(@CurrentUser() user: AuthUser) {
    return this.applications.myApplications(user);
  }

  @Get('applications/for-vacancy/:vacancyId')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Мой отклик на вакансию (если есть)' })
  forVacancy(@Param('vacancyId') vacancyId: string, @CurrentUser() user: AuthUser) {
    return this.applications.myApplicationForVacancy(vacancyId, user);
  }

  @Get('applications/:id')
  @Roles(UserRole.CANDIDATE, UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Отклик по id (ownership)' })
  one(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications.findOne(id, user);
  }

  @Post('applications/:id/withdraw')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Отозвать свой отклик' })
  withdraw(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications.withdraw(id, user);
  }

  @Patch('applications/:id/review')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Работодатель: REVIEWING / ACCEPTED / REJECTED' })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applications.employerReview(id, dto, user);
  }

  @Get('vacancies/:vacancyId/applications')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Отклики на вакансию работодателя' })
  forEmployerVacancy(@Param('vacancyId') vacancyId: string, @CurrentUser() user: AuthUser) {
    return this.applications.listForVacancy(vacancyId, user);
  }
}
