import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CandidatesModule } from './candidates/candidates.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { MatchingModule } from './matching/matching.module';
import { OffersModule } from './offers/offers.module';
import { FspModule } from './fsp/fsp.module';
import { ResumesModule } from './resumes/resumes.module';
import { AdminModule } from './admin/admin.module';
import { CompaniesModule } from './companies/companies.module';
import { TestsModule } from './tests/tests.module';
import { SkillsModule } from './skills/skills.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: Number(process.env.AUTH_RATE_LIMIT_TTL || 60) * 1000,
            limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
          },
        ],
        storage: new RedisThrottlerStorage(),
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CandidatesModule,
    CompaniesModule,
    VacanciesModule,
    MatchingModule,
    OffersModule,
    FspModule,
    ResumesModule,
    TestsModule,
    SkillsModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
