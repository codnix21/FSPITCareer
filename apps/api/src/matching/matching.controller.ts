import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { SearchCandidatesDto, SemanticMatchDto } from './dto/search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Подбор')
@Controller()
export class MatchingController {
  constructor(private matching: MatchingService) {}

  @Post('matching/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поиск специалистов по требованиям' })
  search(@Body() dto: SearchCandidatesDto) {
    return this.matching.search(dto);
  }

  @Get('matching/vacancies/:vacancyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подбор специалистов под вакансию' })
  forVacancy(@Param('vacancyId') vacancyId: string) {
    return this.matching.matchForVacancy(vacancyId);
  }

  @Get('matching/candidates/:candidateId/vacancies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подходящие вакансии для кандидата' })
  forCandidate(@Param('candidateId') candidateId: string) {
    return this.matching.matchCandidateToVacancies(candidateId);
  }

  @Get('matching/pair')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Пара кандидат–вакансия: score + reasons + semantic' })
  pair(@Query('candidateId') candidateId: string, @Query('vacancyId') vacancyId: string) {
    return this.matching.pair(candidateId, vacancyId);
  }

  @Post('v1/matching/semantic')
  @ApiOperation({ summary: 'Семантическое соответствие (ML / fallback)' })
  semantic(@Body() dto: SemanticMatchDto) {
    return this.matching.semantic(dto);
  }
}
