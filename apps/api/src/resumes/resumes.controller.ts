import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Резюме')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(private resumes: ResumesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Загрузить резюме (PDF/DOCX)' })
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') userId: string) {
    if (!file) throw new BadRequestException('Файл не передан');
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.mimetype) && !/\.(pdf|docx?)$/i.test(file.originalname)) {
      throw new BadRequestException('Допустимы только PDF и DOCX');
    }
    return this.resumes.upload(userId, file);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Анализ резюме' })
  analyze(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.resumes.analyze(id, userId);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Применить результат анализа к профилю' })
  apply(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.resumes.applyToProfile(id, userId);
  }
}
