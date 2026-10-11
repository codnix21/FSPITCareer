import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ChallengesService } from './challenges.service';
import {
  AdminChallengeQuestionDto,
  AdminChallengeStatusDto,
  AdminCreateChallengeDto,
  AdminUpdateChallengeDto,
} from './dto/challenge.dto';

@ApiTags('Админ — технические задания')
@Controller('admin/challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ChallengesAdminController {
  constructor(private challenges: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'Список challenges' })
  list() {
    return this.challenges.adminList();
  }

  @Post()
  @ApiOperation({ summary: 'Создать challenge (DRAFT)' })
  create(@Body() dto: AdminCreateChallengeDto) {
    return this.challenges.adminCreate(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить metadata challenge' })
  update(@Param('id') id: string, @Body() dto: AdminUpdateChallengeDto) {
    return this.challenges.adminUpdate(id, dto);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Добавить вопрос' })
  addQuestion(@Param('id') id: string, @Body() dto: AdminChallengeQuestionDto) {
    return this.challenges.adminAddQuestion(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'PUBLISHED / CLOSED / ARCHIVED / DRAFT' })
  setStatus(@Param('id') id: string, @Body() dto: AdminChallengeStatusDto) {
    return this.challenges.adminSetStatus(id, dto.status);
  }
}
