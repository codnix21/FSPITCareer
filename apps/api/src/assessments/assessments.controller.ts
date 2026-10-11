import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssessmentsService } from './assessments.service';
import { SaveAnswerDto } from './dto/assessment.dto';

type AuthUser = { id: string; role: UserRole; emailVerified?: boolean };

@ApiTags('Техническое тестирование')
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private assessments: AssessmentsService) {}

  @Get()
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Доступные тесты по специализации' })
  list(@CurrentUser() user: AuthUser) {
    return this.assessments.listPublished(user);
  }

  @Get('results/me')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Мои результаты тестирования' })
  myResults(@CurrentUser() user: AuthUser) {
    return this.assessments.myResults(user);
  }

  @Get('attempts/:attemptId')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить попытку (без correctAnswer)' })
  getAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: AuthUser) {
    return this.assessments.getAttempt(attemptId, user);
  }

  @Post('attempts/:attemptId/answers')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Сохранить ответ' })
  saveAnswer(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessments.saveAnswer(attemptId, dto, user);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Завершить тест — score на backend' })
  submit(@Param('attemptId') attemptId: string, @CurrentUser() user: AuthUser) {
    return this.assessments.submit(attemptId, user);
  }

  @Get(':id')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Карточка теста перед стартом' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessments.getOne(id, user);
  }

  @Post(':id/start')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Начать или продолжить попытку' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessments.start(id, user);
  }
}
