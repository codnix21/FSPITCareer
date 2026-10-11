import { BadRequestException } from '@nestjs/common';
import { CandidateCategoryService } from './candidate-category.service';
import { Grade } from '@prisma/client';

describe('CandidateCategoryService', () => {
  const prisma = {
    specialization: { findUnique: jest.fn() },
    candidateCategory: { findUnique: jest.fn(), create: jest.fn() },
  };
  let service: CandidateCategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CandidateCategoryService(prisma as any);
  });

  it('resolves Backend + Middle category', async () => {
    prisma.specialization.findUnique.mockResolvedValue({
      id: 'spec-be',
      name: 'Backend Development',
      slug: 'backend-development',
      isActive: true,
      industry: { id: 'it' },
    });
    prisma.candidateCategory.findUnique.mockResolvedValue({
      id: 'cat1',
      specializationId: 'spec-be',
      grade: Grade.MIDDLE,
      name: 'Backend Development · Middle',
      slug: 'backend-development-middle',
    });
    const { category } = await service.resolveCategory('spec-be', Grade.MIDDLE);
    expect(category.slug).toBe('backend-development-middle');
  });

  it('rejects specialization from another industry', async () => {
    prisma.specialization.findUnique.mockResolvedValue({
      id: 'spec-be',
      industryId: 'it',
      isActive: true,
    });
    await expect(
      service.validateCategoryCombination({
        industryId: 'other',
        specializationId: 'spec-be',
        grade: Grade.MIDDLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects category mismatched to specialization', async () => {
    prisma.specialization.findUnique.mockResolvedValue({
      id: 'spec-be',
      industryId: 'it',
      isActive: true,
    });
    prisma.candidateCategory.findUnique.mockResolvedValue({
      id: 'cat-fe',
      specializationId: 'spec-fe',
      grade: Grade.MIDDLE,
      isActive: true,
    });
    await expect(
      service.validateCategoryCombination({
        industryId: 'it',
        specializationId: 'spec-be',
        candidateCategoryId: 'cat-fe',
        grade: Grade.MIDDLE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
