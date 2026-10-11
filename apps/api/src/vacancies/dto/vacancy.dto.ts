import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Grade, WorkFormat, VacancyStatus } from '@prisma/client';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  roleTitle: string;

  @ApiProperty({ enum: Grade })
  @IsEnum(Grade)
  grade: Grade;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryTo?: number;

  @ApiPropertyOptional({ enum: WorkFormat })
  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiProperty({ type: [String], example: ['Python', 'FastAPI', 'PostgreSQL'] })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specializationId?: string;
}

export class UpdateVacancyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({ enum: Grade })
  @IsOptional()
  @IsEnum(Grade)
  grade?: Grade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  experienceTo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salaryTo?: number;

  @ApiPropertyOptional({ enum: WorkFormat })
  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({ enum: VacancyStatus })
  @IsOptional()
  @IsEnum(VacancyStatus)
  status?: VacancyStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specializationId?: string;
}
