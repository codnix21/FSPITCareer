import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FspService } from './fsp.service';

@ApiTags('ФСП')
@Controller()
export class FspController {
  constructor(private fsp: FspService) {}

  @Get('fsp/participants')
  @ApiOperation({ summary: 'Список участников ФСП' })
  list() {
    return this.fsp.listParticipants();
  }

  @Get('fsp/participants/:id')
  @ApiOperation({ summary: 'Участник ФСП по id' })
  one(@Param('id') id: string) {
    return this.fsp.getParticipant(id);
  }

  @Get('v1/fsp/participants/:id')
  @ApiOperation({ summary: 'Mock API ФСП: участник' })
  v1one(@Param('id') id: string) {
    return this.fsp.getParticipant(id);
  }

  @Get('fsp/achievements')
  @ApiOperation({ summary: 'Все достижения ФСП' })
  achievements() {
    return this.fsp.listAchievements();
  }
}
