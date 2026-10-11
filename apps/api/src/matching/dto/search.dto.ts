import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, WorkFormat } from '@prisma/client';

export class SearchCandidatesDto {
  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  roleTitle: string;

  @ApiPropertyOptional({ description: 'ID специализации' })
  @IsOptional()
  @IsString()
  specializationId?: string;

  @ApiProperty({ enum: Grade })
  @IsEnum(Grade)
  grade: Grade;

  @ApiProperty({ type: [String], example: ['Python', 'FastAPI', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceFrom?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceTo?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  salaryFrom?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  salaryTo?: number;

  @ApiPropertyOptional({ enum: WorkFormat })
  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @ApiPropertyOptional({ example: 'match' })
  @IsOptional()
  @IsString()
  sortBy?: 'match' | 'experience' | 'achievements' | 'salary';

  @ApiPropertyOptional()
  @IsOptional()
  hasFspAchievements?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  vacancyId?: string;
}

export class SemanticMatchDto {
  @ApiProperty()
  @IsString()
  candidate_id: string;

  @ApiProperty()
  @IsString()
  vacancy_id: string;
}
