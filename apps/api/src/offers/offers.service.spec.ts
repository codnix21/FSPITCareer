import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferStatus, UserRole } from '@prisma/client';

describe('OffersService state machine & ownership', () => {
  const prisma = {
    offer: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    company: { findUnique: jest.fn() },
    vacancy: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  let service: OffersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OffersService(prisma as any, audit as any);
  });

  it('forbids ACCEPTED → PENDING', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.ACCEPTED,
      candidateId: 'c1',
      employerId: 'e1',
    });
    await expect(
      service.updateStatus('o1', { status: OfferStatus.PENDING }, { id: 'c1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids candidate accepting someone else offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.PENDING,
      candidateId: 'c1',
      employerId: 'e1',
    });
    await expect(
      service.updateStatus('o1', { status: OfferStatus.ACCEPTED }, { id: 'intruder', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows candidate to accept own PENDING offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.PENDING,
      candidateId: 'c1',
      employerId: 'e1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    prisma.offer.update.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.ACCEPTED,
      vacancyId: 'v1',
      companyId: 'co1',
      employerId: 'e1',
      candidateId: 'c1',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
      candidate: { id: 'c1', firstName: 'A', lastName: 'B', email: 'a@b.ru', candidateProfile: { id: 'p1' } },
      employer: { id: 'e1', firstName: 'H', lastName: 'R', email: 'h@r.ru' },
    });
    const res = await service.updateStatus('o1', { status: OfferStatus.ACCEPTED }, { id: 'c1', role: UserRole.CANDIDATE });
    expect(res.status).toBe(OfferStatus.ACCEPTED);
    expect(res.employer?.email).toBe('h@r.ru');
  });

  it('forbids REJECTED → ACCEPTED and WITHDRAWN → ACCEPTED', async () => {
    for (const status of [OfferStatus.REJECTED, OfferStatus.WITHDRAWN]) {
      prisma.offer.findUnique.mockResolvedValue({
        id: 'o1',
        status,
        candidateId: 'c1',
        employerId: 'e1',
        expiresAt: new Date(Date.now() + 86400000),
      });
      await expect(
        service.updateStatus('o1', { status: OfferStatus.ACCEPTED }, { id: 'c1', role: UserRole.CANDIDATE }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
