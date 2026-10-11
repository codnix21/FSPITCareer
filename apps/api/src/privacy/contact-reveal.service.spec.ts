import { ForbiddenException } from '@nestjs/common';
import { ContactRevealService } from './contact-reveal.service';
import { ApplicationStatus, OfferStatus, UserRole } from '@prisma/client';

describe('ContactRevealService', () => {
  const prisma = {
    candidateProfile: { findUnique: jest.fn() },
    offer: { findFirst: jest.fn() },
    application: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  let service: ContactRevealService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactRevealService(prisma as any, audit as any);
  });

  it('forbids contact before ACCEPTED offer and without application', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1', userId: 'cand' });
    prisma.offer.findFirst.mockResolvedValue(null);
    prisma.application.findFirst.mockResolvedValue(null);
    await expect(
      service.revealCandidateContact({ id: 'emp', role: UserRole.EMPLOYER }, 'p1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reveals contact after ACCEPTED offer for owning employer', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1', userId: 'cand' });
    prisma.offer.findFirst.mockResolvedValue({ id: 'o1', status: OfferStatus.ACCEPTED });
    prisma.user.findUnique.mockResolvedValue({ email: 'cand@example.ru', phone: null });
    const res = await service.revealCandidateContact({ id: 'emp', role: UserRole.EMPLOYER }, 'p1');
    expect(res.email).toBe('cand@example.ru');
    expect(res.reason).toBe('ACCEPTED_OFFER');
    expect(res.offerId).toBe('o1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONTACT_REVEALED', metadata: expect.objectContaining({ offerId: 'o1' }) }),
    );
    expect(JSON.stringify(audit.log.mock.calls[0][0].metadata)).not.toContain('cand@example.ru');
  });

  it('reveals contact via SELF_APPLICATION for vacancy owner', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1', userId: 'cand' });
    prisma.offer.findFirst.mockResolvedValue(null);
    prisma.application.findFirst.mockResolvedValue({
      id: 'app1',
      status: ApplicationStatus.SUBMITTED,
    });
    prisma.user.findUnique.mockResolvedValue({ email: 'cand@example.ru', phone: null });
    const res = await service.revealCandidateContact({ id: 'emp', role: UserRole.EMPLOYER }, 'p1');
    expect(res.reason).toBe('SELF_APPLICATION');
    expect(res.applicationId).toBe('app1');
    expect(res.offerId).toBeNull();
    expect(JSON.stringify(audit.log.mock.calls[0][0].metadata)).not.toContain('cand@example.ru');
  });

  it('candidate role cannot reveal contacts', async () => {
    await expect(
      service.revealCandidateContact({ id: 'cand', role: UserRole.CANDIDATE }, 'p1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
