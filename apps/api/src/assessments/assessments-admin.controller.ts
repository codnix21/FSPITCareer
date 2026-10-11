import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessmentStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import {
  AdminCreateAssessmentDto,
  AdminCreateQuestionDto,
  AdminPublishAssessmentDto,
} from './dto/assessment.dto';

@ApiTags('Админ — тестирование')
@Controller('admin/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AssessmentsAdminController {
  constructor(private assessments: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Список assessments' })
  list() {
    return this.assessments.adminList();
  }

  @Post()
  @ApiOperation({ summary: 'Создать assessment' })
  create(@Body() dto: AdminCreateAssessmentDto) {
    return this.assessments.adminCreate(dto);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Добавить вопрос' })
  addQuestion(@Param('id') id: string, @Body() dto: AdminCreateQuestionDto) {
    return this.assessments.adminAddQuestion(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'PUBLISHED / ARCHIVED / DRAFT' })
  setStatus(@Param('id') id: string, @Body() dto: AdminPublishAssessmentDto) {
    return this.assessments.adminSetStatus(id, dto.status || AssessmentStatus.PUBLISHED);
  }
}
