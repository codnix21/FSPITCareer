import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus, WorkFormat } from '@prisma/client';

export class CreateOfferDto {
  @ApiProperty()
  @IsString()
  vacancyId: string;

  @ApiProperty()
  @IsString()
  candidateUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ enum: WorkFormat })
  @IsOptional()
  @IsEnum(WorkFormat)
  workFormat?: WorkFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateOfferDto {
  @ApiProperty({ enum: OfferStatus })
  @IsEnum(OfferStatus)
  status: OfferStatus;
}
