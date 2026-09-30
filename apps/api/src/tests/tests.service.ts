import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestDto } from './dto/test.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.test.findMany({
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { total: items.length, items };
  }

  async getOne(id: string) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          select: { id: true, question: true, options: true },
        },
      },
    });
    if (!test) throw new NotFoundException('Тест не найден');
    return test;
  }

  async submit(testId: string, dto: SubmitTestDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.CANDIDATE && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Только соискатель может проходить тест');
    }

    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { questions: true },
    });
    if (!test) throw new NotFoundException('Тест не найден');
    if (dto.answers.length !== test.questions.length) {
      throw new BadRequestException('Количество ответов не совпадает с числом вопросов');
    }

    const profile =
      user.role === UserRole.ADMIN && dto.candidateProfileId
        ? await this.prisma.candidateProfile.findUnique({ where: { id: dto.candidateProfileId } })
        : await this.prisma.candidateProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');

    let correct = 0;
    test.questions.forEach((q, i) => {
      if (dto.answers[i] === q.answer) correct++;
    });
    const maxScore = test.questions.length * 100;
    const score = Math.round((correct / test.questions.length) * 100);

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testId,
        candidateId: profile.id,
        score,
        maxScore: 100,
      },
      include: { test: true },
    });

    return {
      message: 'Тест завершён',
      score,
      maxScore: 100,
      correct,
      total: test.questions.length,
      attempt,
    };
  }

  async myAttempts(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Профиль кандидата не найден');
    return this.prisma.testAttempt.findMany({
      where: { candidateId: profile.id },
      include: { test: true },
      orderBy: { completedAt: 'desc' },
    });
  }
}
