import { IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitTestDto {
  @ApiProperty({ type: [Number], description: 'Индексы выбранных ответов' })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  answers: number[];

  @ApiPropertyOptional()
  @IsOptional()
  candidateProfileId?: string;
}
