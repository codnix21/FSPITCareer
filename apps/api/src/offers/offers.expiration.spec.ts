import { BadRequestException } from '@nestjs/common';
import { OfferStatus, UserRole } from '@prisma/client';
import { OffersService } from './offers.service';

describe('OffersService expiration & snapshot', () => {
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

  it('expireIfNeeded marks PENDING past expiresAt as EXPIRED', async () => {
    const expired = {
      id: 'o1',
      status: OfferStatus.PENDING,
      expiresAt: new Date(Date.now() - 1000),
    };
    prisma.offer.update.mockResolvedValue({ ...expired, status: OfferStatus.EXPIRED });
    const res = await service.expireIfNeeded(expired);
    expect(prisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: OfferStatus.EXPIRED } }),
    );
    expect(res.status).toBe(OfferStatus.EXPIRED);
  });

  it('cannot accept expired offer', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.PENDING,
      candidateId: 'c1',
      employerId: 'e1',
      expiresAt: new Date(Date.now() - 5000),
    });
    prisma.offer.update.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.EXPIRED,
      candidateId: 'c1',
      employerId: 'e1',
      expiresAt: new Date(Date.now() - 5000),
    });

    await expect(
      service.updateStatus('o1', { status: OfferStatus.ACCEPTED }, { id: 'c1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create snapshots vacancy salary/title independent of later vacancy edits', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'co1', userId: 'e1' });
    prisma.vacancy.findUnique.mockResolvedValue({
      id: 'v1',
      companyId: 'co1',
      title: 'Backend Developer',
      description: 'Build APIs',
      salaryFrom: 200000,
      salaryTo: 250000,
      workFormat: 'REMOTE',
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'c1', role: UserRole.CANDIDATE });
    prisma.offer.findFirst.mockResolvedValue(null);
    prisma.offer.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'o1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        candidate: { id: 'c1', firstName: 'A', lastName: 'B', email: 'a@b.ru', candidateProfile: { id: 'p1' } },
        employer: { id: 'e1', firstName: 'H', lastName: 'R', email: 'h@r.ru' },
        company: { id: 'co1' },
        vacancy: { id: 'v1', title: 'CHANGED LATER', salaryFrom: 999999 },
      }),
    );

    const res = await service.create(
      { vacancyId: 'v1', candidateUserId: 'c1', salary: 210000 },
      'e1',
    );

    expect(prisma.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Backend Developer',
          description: 'Build APIs',
          salaryFrom: 210000,
          salaryTo: 250000,
          currency: 'RUB',
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(res.title).toBe('Backend Developer');
    expect(res.salaryFrom).toBe(210000);
    expect(res.salaryFrom).not.toBe(999999);
  });

  it('forbids EXPIRED → ACCEPTED', async () => {
    prisma.offer.findUnique.mockResolvedValue({
      id: 'o1',
      status: OfferStatus.EXPIRED,
      candidateId: 'c1',
      employerId: 'e1',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.updateStatus('o1', { status: OfferStatus.ACCEPTED }, { id: 'c1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
