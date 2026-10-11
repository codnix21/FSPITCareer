import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty()
  @IsString()
  vacancyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  coverLetter?: string;
}

/** Employer-only status transitions */
export class ReviewApplicationDto {
  @ApiProperty({ enum: [ApplicationStatus.REVIEWING, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED] })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
