import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, ProfileStatus, UserRole, VacancyStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  const prisma: any = {
    candidateProfile: { findUnique: jest.fn() },
    vacancy: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    application: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    match: { findUnique: jest.fn().mockResolvedValue(null) },
    user: { findUnique: jest.fn() },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const contacts = {
    canRevealCandidateContact: jest.fn(),
    revealCandidateContact: jest.fn(),
  };

  let service: ApplicationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ApplicationsService(prisma, audit as any, contacts as any);
  });

  it('candidate creates application', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.AVAILABLE,
    });
    prisma.vacancy.findUnique.mockResolvedValue({
      id: 'v1',
      status: VacancyStatus.ACTIVE,
      company: { userId: 'emp1' },
    });
    prisma.application.findFirst.mockResolvedValue(null);
    prisma.application.create.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      vacancyId: 'v1',
      status: ApplicationStatus.SUBMITTED,
      coverLetter: 'Hi',
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
      withdrawnAt: null,
      vacancy: { id: 'v1', title: 'Backend', status: 'ACTIVE', grade: 'MIDDLE', company: { id: 'c1', name: 'Co' } },
    });

    const res = await service.create(
      { vacancyId: 'v1', coverLetter: 'Hi' },
      { id: 'u1', role: UserRole.CANDIDATE },
    );
    expect(res.status).toBe(ApplicationStatus.SUBMITTED);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPLICATION_CREATED', metadata: expect.not.objectContaining({ email: expect.anything() }) }),
    );
  });

  it('non-candidate cannot create', async () => {
    await expect(
      service.create({ vacancyId: 'v1' }, { id: 'e1', role: UserRole.EMPLOYER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('invalid vacancy', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.AVAILABLE,
    });
    prisma.vacancy.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ vacancyId: 'missing' }, { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('inactive vacancy rejected', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.AVAILABLE,
    });
    prisma.vacancy.findUnique.mockResolvedValue({
      id: 'v1',
      status: VacancyStatus.CLOSED,
      company: { userId: 'emp' },
    });
    await expect(
      service.create({ vacancyId: 'v1' }, { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('duplicate active application rejected', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.AVAILABLE,
    });
    prisma.vacancy.findUnique.mockResolvedValue({
      id: 'v1',
      status: VacancyStatus.ACTIVE,
      company: { userId: 'emp' },
    });
    prisma.application.findFirst.mockResolvedValue({ id: 'a1', status: ApplicationStatus.SUBMITTED });
    await expect(
      service.create({ vacancyId: 'v1' }, { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('concurrent duplicate maps P2002 to Conflict', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.AVAILABLE,
    });
    prisma.vacancy.findUnique.mockResolvedValue({
      id: 'v1',
      status: VacancyStatus.ACTIVE,
      company: { userId: 'emp' },
    });
    prisma.application.findFirst.mockResolvedValue(null);
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.application.create.mockRejectedValue(err);
    await expect(
      service.create({ vacancyId: 'v1' }, { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('candidate cannot see another application', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'pA', userId: 'uA' });
    prisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'pB',
      vacancyId: 'v1',
      status: ApplicationStatus.SUBMITTED,
      vacancy: { company: {} },
      candidate: null,
    });
    await expect(
      service.findOne('a1', { id: 'uA', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('candidate can withdraw own SUBMITTED', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    prisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      vacancyId: 'v1',
      status: ApplicationStatus.SUBMITTED,
    });
    prisma.application.update.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      vacancyId: 'v1',
      status: ApplicationStatus.WITHDRAWN,
      withdrawnAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
      coverLetter: null,
      vacancy: { id: 'v1', title: 'T', status: 'ACTIVE', grade: 'MIDDLE', company: { id: 'c', name: 'Co' } },
    });
    const res = await service.withdraw('a1', { id: 'u1', role: UserRole.CANDIDATE });
    expect(res.status).toBe(ApplicationStatus.WITHDRAWN);
  });

  it('candidate cannot withdraw ACCEPTED', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1' });
    prisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      candidateId: 'p1',
      status: ApplicationStatus.ACCEPTED,
    });
    await expect(
      service.withdraw('a1', { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('candidate cannot set ACCEPTED via review', async () => {
    await expect(
      service.employerReview(
        'a1',
        { status: ApplicationStatus.ACCEPTED },
        { id: 'u1', role: UserRole.CANDIDATE },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('employer can REVIEW and REJECT; invalid transition blocked', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'co1', userId: 'e1' });
    prisma.vacancy.findUnique.mockResolvedValue({ id: 'v1', companyId: 'co1' });
    prisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      vacancyId: 'v1',
      candidateId: 'p1',
      status: ApplicationStatus.SUBMITTED,
    });
    prisma.application.update.mockResolvedValue({
      id: 'a1',
      vacancyId: 'v1',
      candidateId: 'p1',
      status: ApplicationStatus.REVIEWING,
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      withdrawnAt: null,
      coverLetter: null,
      vacancy: { id: 'v1', company: { id: 'co1', userId: 'e1' } },
      candidate: {
        id: 'p1',
        userId: 'u1',
        roleTitle: 'Backend',
        grade: 'MIDDLE',
        experienceYears: 3,
        workFormat: 'REMOTE',
        user: { id: 'u1', firstName: 'A', lastName: 'B' },
        skills: [],
        achievements: [],
        assessmentResults: [],
      },
    });
    contacts.canRevealCandidateContact.mockResolvedValue({
      allowed: true,
      reason: 'SELF_APPLICATION',
      application: { id: 'a1' },
      offer: null,
      profile: { id: 'p1', userId: 'u1' },
    });
    prisma.user.findUnique.mockResolvedValue({ email: 'c@x.ru', phone: null });

    const res = await service.employerReview(
      'a1',
      { status: ApplicationStatus.REVIEWING },
      { id: 'e1', role: UserRole.EMPLOYER },
    );
    expect(res.status).toBe(ApplicationStatus.REVIEWING);
    expect(res.contact?.email).toBe('c@x.ru');
    expect(JSON.stringify(res.candidate)).not.toContain('c@x.ru');

    prisma.application.findUnique.mockResolvedValue({
      id: 'a1',
      vacancyId: 'v1',
      candidateId: 'p1',
      status: ApplicationStatus.ACCEPTED,
    });
    await expect(
      service.employerReview(
        'a1',
        { status: ApplicationStatus.REJECTED },
        { id: 'e1', role: UserRole.EMPLOYER },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('employer cannot access foreign vacancy applications', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'co1', userId: 'e1' });
    prisma.vacancy.findUnique.mockResolvedValue({ id: 'v2', companyId: 'coOTHER' });
    await expect(
      service.listForVacancy('v2', { id: 'e1', role: UserRole.EMPLOYER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('profile not AVAILABLE cannot apply', async () => {
    prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      profileStatus: ProfileStatus.ASSESSMENT_REQUIRED,
    });
    await expect(
      service.create({ vacancyId: 'v1' }, { id: 'u1', role: UserRole.CANDIDATE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
