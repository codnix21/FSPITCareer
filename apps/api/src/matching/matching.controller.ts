import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { SearchCandidatesDto, SemanticMatchDto } from './dto/search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Подбор')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchingController {
  constructor(private matching: MatchingService) {}

  @Post('matching/search')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Поиск специалистов по требованиям' })
  search(@Body() dto: SearchCandidatesDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.matching.search(dto, user);
  }

  @Get('matching/vacancies/:vacancyId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Подбор специалистов под вакансию' })
  forVacancy(@Param('vacancyId') vacancyId: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.matching.matchForVacancy(vacancyId, user);
  }

  @Get('matching/candidates/:candidateId/vacancies')
  @ApiOperation({ summary: 'Подходящие вакансии для кандидата' })
  forCandidate(
    @Param('candidateId') candidateId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.matching.matchCandidateToVacancies(candidateId, user);
  }

  @Get('matching/pair')
  @ApiOperation({ summary: 'Пара кандидат–вакансия: score + reasons + semantic' })
  pair(
    @Query('candidateId') candidateId: string,
    @Query('vacancyId') vacancyId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.matching.pair(candidateId, vacancyId, user);
  }

  @Post('v1/matching/semantic')
  @ApiOperation({ summary: 'Семантическое соответствие (ML / fallback)' })
  semantic(@Body() dto: SemanticMatchDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.matching.semantic(dto, user);
  }
}
