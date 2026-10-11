import { BadRequestException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { createHash } from 'crypto';

describe('EmailVerificationService', () => {
  const prisma = {
    emailVerificationToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };
  const mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  let service: EmailVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_VERIFICATION_RETURN_TOKEN = 'true';
    process.env.NODE_ENV = 'test';
    service = new EmailVerificationService(prisma as any, mail as any, audit as any);
  });

  it('issues hashed token and does not log raw token in audit', async () => {
    prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.emailVerificationToken.create.mockResolvedValue({});
    const issued = await service.issueToken('u1', 'a@b.ru', 'Иван');
    expect(issued.token).toBeTruthy();
    expect(mail.sendVerificationEmail).toHaveBeenCalled();
    const createData = prisma.emailVerificationToken.create.mock.calls[0][0].data;
    expect(createData.tokenHash).toBe(createHash('sha256').update(issued.token!).digest('hex'));
    expect(createData.tokenHash).not.toBe(issued.token);
  });

  it('verifies valid token once', async () => {
    const raw = 'a'.repeat(32);
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1' },
    });
    prisma.emailVerificationToken.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    await service.verifyToken(raw);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects used token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: 't1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.verifyToken('x'.repeat(32))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired token', async () => {
    prisma.emailVerificationToken.findFirst.mockResolvedValue({
      id: 't1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.verifyToken('x'.repeat(32))).rejects.toBeInstanceOf(BadRequestException);
  });
});
