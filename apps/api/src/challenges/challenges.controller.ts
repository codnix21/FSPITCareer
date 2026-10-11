import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChallengesService } from './challenges.service';
import { SaveChallengeAnswerDto } from './dto/challenge.dto';

type AuthUser = { id: string; role: UserRole; emailVerified?: boolean };

@ApiTags('Технические задания')
@Controller('challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChallengesController {
  constructor(private challenges: ChallengesService) {}

  @Get()
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Опубликованные задания (без вопросов)' })
  list(@CurrentUser() user: AuthUser) {
    return this.challenges.listPublished(user);
  }

  @Get('results/me')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'История результатов кандидата' })
  myResults(@CurrentUser() user: AuthUser) {
    return this.challenges.myResults(user);
  }

  @Get('attempts/:attemptId')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Попытка с вопросами (без answer key)' })
  getAttempt(@Param('attemptId') attemptId: string, @CurrentUser() user: AuthUser) {
    return this.challenges.getAttempt(attemptId, user);
  }

  @Post('attempts/:attemptId/answers')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Сохранить ответ' })
  saveAnswer(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveChallengeAnswerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.challenges.saveAnswer(attemptId, dto, user);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Завершить задание — score на backend' })
  submit(@Param('attemptId') attemptId: string, @CurrentUser() user: AuthUser) {
    return this.challenges.submit(attemptId, user);
  }

  @Get(':id/results/me')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Результаты кандидата по заданию' })
  myResultForChallenge(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.challenges.myResultForChallenge(id, user);
  }

  @Get(':id')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @ApiOperation({ summary: 'Карточка задания (без вопросов)' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.challenges.getOne(id, user);
  }

  @Post(':id/start')
  @Roles(UserRole.CANDIDATE, UserRole.ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Начать или продолжить попытку' })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.challenges.start(id, user);
  }
}
