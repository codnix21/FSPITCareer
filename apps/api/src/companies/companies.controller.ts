import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Компании')
@Controller('companies')
export class CompaniesController {
  constructor(private companies: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Список компаний' })
  list() {
    return this.companies.list();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Моя компания' })
  me(@CurrentUser('id') userId: string) {
    return this.companies.findByUserId(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить профиль компании' })
  updateMe(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(user.id, dto, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Компания по id' })
  one(@Param('id') id: string) {
    return this.companies.findOne(id);
  }
}
