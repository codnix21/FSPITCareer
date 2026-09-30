import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@ApiTags('Уведомления')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Сводка уведомлений для текущего пользователя' })
  async list(@CurrentUser() user: { id: string; role: UserRole }) {
    type Note = { type: string; title: string; message: string; href: string; count: number };

    if (user.role === UserRole.CANDIDATE) {
      const pendingOffers = await this.prisma.offer.count({
        where: { candidateId: user.id, status: 'PENDING' },
      });
      const items: Note[] = [];
      if (pendingOffers > 0) {
        items.push({
          type: 'OFFERS',
          title: 'Входящие предложения',
          message: `У вас ${pendingOffers} новых предложений от работодателей`,
          href: '/candidate/dashboard',
          count: pendingOffers,
        });
      }
      return { total: items.length, items, pendingOffers };
    }

    if (user.role === UserRole.EMPLOYER) {
      const responses = await this.prisma.offer.count({
        where: { employerId: user.id, status: { in: ['ACCEPTED', 'REJECTED'] } },
      });
      const pending = await this.prisma.offer.count({
        where: { employerId: user.id, status: 'PENDING' },
      });
      const items: Note[] = [];
      if (responses > 0) {
        items.push({
          type: 'RESPONSES',
          title: 'Ответы кандидатов',
          message: `Получено ответов: ${responses}`,
          href: '/employer/offers',
          count: responses,
        });
      }
      if (pending > 0) {
        items.push({
          type: 'PENDING',
          title: 'Ожидают ответа',
          message: `Предложений без ответа: ${pending}`,
          href: '/employer/offers',
          count: pending,
        });
      }
      return { total: items.length, items, responses, pending };
    }

    return { total: 0, items: [] as Note[] };
  }
}
