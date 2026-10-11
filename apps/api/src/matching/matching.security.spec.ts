import { ForbiddenException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { UserRole } from '@prisma/client';

describe('MatchingService security', () => {
  const prisma = {
    company: { findUnique: jest.fn() },
    vacancy: { findUnique: jest.fn() },
    candidateProfile: { findMany: jest.fn(), findUnique: jest.fn() },
    match: { upsert: jest.fn() },
  };
  let service: MatchingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchingService(prisma as any);
  });

  it('candidate cannot use employer search', async () => {
    await expect(
      service.search(
        { roleTitle: 'Backend', grade: 'MIDDLE' as any, technologies: ['Python'] },
        { id: 'c1', role: UserRole.CANDIDATE },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('employer cannot semantic-match foreign vacancy', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'co1', userId: 'e1' });
    prisma.vacancy.findUnique.mockResolvedValue({ id: 'v2', companyId: 'other' });
    await expect(
      service.semantic({ candidate_id: 'p1', vacancy_id: 'v2' }, { id: 'e1', role: UserRole.EMPLOYER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('semantic without user is forbidden', async () => {
    await expect(service.semantic({ candidate_id: 'p1', vacancy_id: 'v1' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
