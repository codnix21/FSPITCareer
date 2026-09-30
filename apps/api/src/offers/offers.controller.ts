import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Предложения')
@Controller('offers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private offers: OffersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Отправить предложение кандидату' })
  create(@Body() dto: CreateOfferDto, @CurrentUser('id') employerId: string) {
    return this.offers.create(dto, employerId);
  }

  @Get()
  @ApiOperation({ summary: 'Список предложений' })
  findAll(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.offers.findAll(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить статус предложения' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.offers.updateStatus(id, dto, user);
  }
}
