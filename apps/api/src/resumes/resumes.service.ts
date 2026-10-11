import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { AuditAction, AuditService } from '../privacy/audit.service';

/** Mock AI resume parser — архитектура готова к замене на реальный ML/LLM сервис */
@Injectable()
export class ResumesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async upload(userId: string, file: Express.Multer.File) {
    const profile = await this.prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Профиль кандидата не найден');

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-а-яА-ЯёЁ]/g, '_')}`;
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, file.buffer);

    const resume = await this.prisma.resume.create({
      data: {
        candidateId: profile.id,
        fileName: file.originalname,
        filePath,
        mimeType: file.mimetype,
        status: 'UPLOADED',
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.RESUME_UPLOADED,
      entityType: 'Resume',
      entityId: resume.id,
    });

    return { id: resume.id, fileName: resume.fileName, status: 'UPLOADED', message: 'Резюме загружено' };
  }

  async analyze(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { candidate: true, analysis: true },
    });
    if (!resume) throw new NotFoundException('Резюме не найдено');
    if (resume.candidate.userId !== userId) throw new ForbiddenException('Нет доступа к резюме');

    await this.prisma.resume.update({ where: { id }, data: { status: 'ANALYZING' } });

    // Mock AI analysis — later replace with ML/LLM service call
    const mock = this.mockParse(resume.candidate.roleTitle, resume.fileName);

    const analysis = await this.prisma.resumeAnalysis.upsert({
      where: { resumeId: id },
      create: {
        resumeId: id,
        roleTitle: mock.roleTitle,
        experienceYears: mock.experienceYears,
        skills: mock.skills,
        rawJson: mock as any,
      },
      update: {
        roleTitle: mock.roleTitle,
        experienceYears: mock.experienceYears,
        skills: mock.skills,
        rawJson: mock as any,
      },
    });

    await this.prisma.resume.update({ where: { id }, data: { status: 'ANALYZED' } });

    // Optionally enrich profile skills
    for (const skillName of mock.skills) {
      const skill = await this.prisma.skill.upsert({
        where: { name: skillName },
        create: {
          name: skillName,
          slug: skillName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, ''),
        },
        update: {},
      });
      await this.prisma.candidateSkill.upsert({
        where: { candidateId_skillId: { candidateId: resume.candidateId, skillId: skill.id } },
        create: { candidateId: resume.candidateId, skillId: skill.id, level: 3 },
        update: {},
      });
    }

    return {
      message: 'Анализ профиля завершён',
      resumeId: id,
      found: {
        role: analysis.roleTitle,
        experience: `${analysis.experienceYears} года`,
        skills: analysis.skills,
      },
      notice: 'Резюме проанализировано. Проверьте извлечённые данные перед применением к профилю.',
      analysis,
      canApply: true,
    };
  }

  async applyToProfile(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { candidate: true, analysis: true },
    });
    if (!resume) throw new NotFoundException('Резюме не найдено');
    if (resume.candidate.userId !== userId) throw new ForbiddenException('Нет доступа к резюме');
    if (!resume.analysis) {
      throw new NotFoundException('Сначала выполните анализ резюме');
    }

    const analysis = resume.analysis;
    await this.prisma.candidateProfile.update({
      where: { id: resume.candidateId },
      data: {
        roleTitle: analysis.roleTitle || resume.candidate.roleTitle,
        experienceYears: analysis.experienceYears ?? resume.candidate.experienceYears,
      },
    });

    for (const skillName of analysis.skills || []) {
      const skill = await this.prisma.skill.upsert({
        where: { name: skillName },
        create: {
          name: skillName,
          slug: skillName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, ''),
        },
        update: {},
      });
      await this.prisma.candidateSkill.upsert({
        where: { candidateId_skillId: { candidateId: resume.candidateId, skillId: skill.id } },
        create: { candidateId: resume.candidateId, skillId: skill.id, level: 3 },
        update: {},
      });
    }

    return {
      message: 'Данные из резюме применены к профилю',
      applied: {
        role: analysis.roleTitle,
        experienceYears: analysis.experienceYears,
        skills: analysis.skills,
      },
    };
  }

  private mockParse(roleHint: string, fileName: string) {
    const lower = `${roleHint} ${fileName}`.toLowerCase();
    if (lower.includes('frontend') || lower.includes('react')) {
      return {
        roleTitle: 'Frontend Developer',
        experienceYears: 3,
        skills: ['TypeScript', 'React', 'Next.js', 'CSS', 'Git'],
      };
    }
    if (lower.includes('devops') || lower.includes('kuber')) {
      return {
        roleTitle: 'DevOps Engineer',
        experienceYears: 4,
        skills: ['Docker', 'Kubernetes', 'Linux', 'CI/CD', 'AWS'],
      };
    }
    return {
      roleTitle: 'Backend Developer',
      experienceYears: 3,
      skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
    };
  }
}
