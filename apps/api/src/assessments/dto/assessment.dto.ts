import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssessmentStatus, Grade, QuestionDifficulty, QuestionType } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty({ type: [Number], example: [0] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(31, { each: true })
  selectedOptionIndexes: number[];
}

export class AdminCreateQuestionDto {
  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty({ enum: QuestionDifficulty })
  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  correctOptionIndexes: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  points?: number;
}

export class AdminBlueprintSectionDto {
  @ApiProperty()
  @IsString()
  skill: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  questionCount: number;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class AdminThresholdDto {
  @ApiProperty({ enum: Grade })
  @IsEnum(Grade)
  grade: Grade;

  @ApiProperty()
  @IsNumber()
  minScore: number;

  @ApiProperty()
  @IsNumber()
  maxScore: number;
}

export class AdminPublishAssessmentDto {
  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}

export class AdminCreateAssessmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  industryId: string;

  @ApiProperty()
  @IsString()
  specializationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeLimitSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cooldownHours?: number;

  @ApiProperty({ type: [AdminBlueprintSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminBlueprintSectionDto)
  sections: AdminBlueprintSectionDto[];

  @ApiProperty({ type: [AdminThresholdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminThresholdDto)
  thresholds: AdminThresholdDto[];
}
