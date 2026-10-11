import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_PROVIDER, EmailProvider } from './email.provider';
import { AuditAction, AuditService } from '../privacy/audit.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private mail: EmailProvider,
    private audit: AuditService,
  ) {}

  private ttlMs() {
    const hours = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);
    return Math.max(1, hours) * 60 * 60 * 1000;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private appUrl() {
    return (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  async issueToken(userId: string, email: string, firstName: string) {
    // Invalidate previous unused tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = randomBytes(32).toString('hex');
    const tokenHash = this.hash(raw);
    const expiresAt = new Date(Date.now() + this.ttlMs());

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const verifyUrl = `${this.appUrl()}/verify-email?token=${raw}`;
    await this.mail.sendVerificationEmail({ to: email, firstName, verifyUrl, expiresAt });

    // Never return raw token except in non-production for automated tests
    if (process.env.NODE_ENV !== 'production' && process.env.EMAIL_VERIFICATION_RETURN_TOKEN === 'true') {
      return { expiresAt, token: raw };
    }
    return { expiresAt };
  }

  async verifyToken(rawToken: string) {
    if (!rawToken?.trim()) throw new BadRequestException('Токен не указан');
    const tokenHash = this.hash(rawToken.trim());
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) throw new BadRequestException('Недействительный токен подтверждения');
    if (record.usedAt) throw new BadRequestException('Токен уже использован');
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Срок действия токена истёк');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
    ]);

    await this.audit.log({
      actorUserId: record.userId,
      action: 'EMAIL_VERIFIED',
      entityType: 'User',
      entityId: record.userId,
    });

    return { message: 'Email подтверждён', userId: record.userId };
  }

  async resend(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) {
      return { message: 'Email уже подтверждён' };
    }
    await this.issueToken(user.id, user.email, user.firstName);
    return { message: 'Если аккаунт существует, письмо отправлено повторно' };
  }

  /** Anti-enumeration resend by email */
  async resendByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && !user.emailVerified) {
      await this.issueToken(user.id, user.email, user.firstName);
    }
    return { message: 'Если аккаунт существует, письмо отправлено повторно' };
  }

  assertVerified(user: { emailVerified?: boolean }) {
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Подтвердите email, чтобы продолжить',
      });
    }
  }
}
