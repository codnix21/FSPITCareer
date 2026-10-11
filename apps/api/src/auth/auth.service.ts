import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { AuditAction, AuditService } from '../privacy/audit.service';
import { EmailVerificationService } from '../email/email-verification.service';

const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || '2026-10-01';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
    private emailVerification: EmailVerificationService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.consentAccepted) {
      throw new BadRequestException('Необходимо согласие с политикой конфиденциальности');
    }
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Регистрация администратора недоступна');
    }
    if (dto.role === UserRole.EMPLOYER && !dto.companyName?.trim()) {
      throw new BadRequestException('Укажите название компании');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const consentAt = new Date();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        emailVerified: false,
        privacySettings: {
          create: {
            consentVersion: PRIVACY_POLICY_VERSION,
            consentAt,
            profileVisibility: 'EMPLOYERS',
            contactVisibility: 'AFTER_ACCEPT',
          },
        },
        ...(dto.role === UserRole.EMPLOYER
          ? {
              company: {
                create: { name: dto.companyName!.trim() },
              },
            }
          : {
              candidateProfile: {
                create: {
                  roleTitle: 'Специалист',
                  grade: 'JUNIOR',
                  experienceYears: 0,
                  workFormat: 'REMOTE',
                  profileStatus: 'DRAFT',
                },
              },
            }),
      },
      include: { company: true, candidateProfile: true, privacySettings: true },
    });

    const issued = await this.emailVerification.issueToken(user.id, user.email, user.firstName);

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.REGISTER,
      entityType: 'User',
      entityId: user.id,
      metadata: { role: user.role, consentVersion: PRIVACY_POLICY_VERSION },
    });

    const auth = this.buildAuthResponse(user);
    return {
      ...auth,
      emailVerificationRequired: true,
      ...(issued as any).token ? { verificationToken: (issued as any).token } : {},
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { company: true, candidateProfile: true, privacySettings: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    await this.audit.log({
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
    });

    return {
      ...this.buildAuthResponse(user),
      emailVerificationRequired: !user.emailVerified,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, candidateProfile: true, privacySettings: true },
    });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName != null ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName != null ? { lastName: dto.lastName.trim() } : {}),
      },
      include: { company: true, candidateProfile: true, privacySettings: true },
    });
    await this.audit.log({
      actorUserId: userId,
      action: AuditAction.PROFILE_UPDATED,
      entityType: 'User',
      entityId: userId,
    });
    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Новый пароль должен отличаться от текущего');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Пароль успешно изменён' };
  }

  async verifyEmail(token: string) {
    return this.emailVerification.verifyToken(token);
  }

  async resendVerification(userId: string) {
    return this.emailVerification.resend(userId);
  }

  async resendVerificationByEmail(email: string) {
    return this.emailVerification.resendByEmail(email);
  }

  private buildAuthResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
