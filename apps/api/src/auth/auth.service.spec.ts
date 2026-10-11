import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../privacy/audit.service';
import { EmailVerificationService } from '../email/email-verification.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { sign: jest.fn().mockReturnValue('token') };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const emailVerification = {
    issueToken: jest.fn().mockResolvedValue({ expiresAt: new Date() }),
    verifyToken: jest.fn(),
    resend: jest.fn(),
    resendByEmail: jest.fn(),
    assertVerified: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AuditService, useValue: audit },
        { provide: EmailVerificationService, useValue: emailVerification },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('регистрирует кандидата', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: '1',
      email: 'a@b.ru',
      role: 'CANDIDATE',
      firstName: 'Иван',
      lastName: 'Петров',
      passwordHash: 'x',
    });
    const res = await service.register({
      email: 'a@b.ru',
      password: 'Demo123!',
      firstName: 'Иван',
      lastName: 'Петров',
      role: 'CANDIDATE' as any,
      consentAccepted: true,
    });
    expect(res.accessToken).toBe('token');
  });

  it('не даёт дублировать email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: '1' });
    await expect(
      service.register({
        email: 'a@b.ru',
        password: 'Demo123!',
        firstName: 'Иван',
        lastName: 'Петров',
        role: 'CANDIDATE' as any,
        consentAccepted: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('отклоняет неверный пароль', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.ru',
      isActive: true,
      passwordHash: '$2b$12$invalid',
    });
    await expect(service.login({ email: 'a@b.ru', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
