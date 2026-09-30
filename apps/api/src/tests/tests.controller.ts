import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TestsService } from './tests.service';
import { SubmitTestDto } from './dto/test.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Тесты')
@Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}

  @Get()
  @ApiOperation({ summary: 'Список тестов' })
  list() {
    return this.tests.list();
  }

  @Get('attempts/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои попытки' })
  myAttempts(@CurrentUser('id') userId: string) {
    return this.tests.myAttempts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Тест с вопросами (без правильных ответов)' })
  one(@Param('id') id: string) {
    return this.tests.getOne(id);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отправить ответы на тест' })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitTestDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.tests.submit(id, dto, user);
  }
}
