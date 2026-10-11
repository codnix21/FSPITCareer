import {
  PrismaClient,
  Grade,
  WorkFormat,
  UserRole,
  ProfileStatus,
  AssessmentStatus,
  AttemptStatus,
  AssessmentResultStatus,
  QuestionDifficulty,
  QuestionType,
  FspAchievementSource,
  ApplicationStatus,
  ChallengeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CITY_CATALOG, SKILL_CATALOG, skillSlug } from './catalog';
import {
  GRADES_FOR_CATEGORY,
  GRADE_LABEL_RU,
  INDUSTRY_IT,
  mapRoleTitleToSpecializationSlug,
  SPECIALIZATIONS,
} from './taxonomy';
import { BACKEND_QUESTIONS } from './assessment-seed/backend-questions';
import { CHALLENGE_SEEDS } from './challenge-seed/challenges';

function recommendGradeFromThresholds(score: number): Grade {
  if (score <= 49) return Grade.INTERN;
  if (score <= 69) return Grade.JUNIOR;
  if (score <= 84) return Grade.MIDDLE;
  return Grade.SENIOR;
}

const prisma = new PrismaClient();
const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION || '2026-10-01';
const privacyCreate = {
  create: {
    consentVersion: PRIVACY_POLICY_VERSION,
    consentAt: new Date(),
    profileVisibility: 'EMPLOYERS',
    contactVisibility: 'AFTER_ACCEPT',
  },
};

const SKILLS = SKILL_CATALOG.map((s) => s.name);

type CandSeed = {
  email: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  grade: Grade;
  experienceYears: number;
  salaryFrom: number;
  salaryTo: number;
  workFormat: WorkFormat;
  skills: string[];
  city: string;
  about: string;
  fspExternalId?: string;
  achievements?: { title: string; discipline: string; place: number; year: number; status: string }[];
  experiences?: { company: string; position: string; yearsAgoStart: number; yearsAgoEnd?: number; description: string }[];
  education?: { institution: string; degree: string; field: string; yearFrom: number; yearTo: number };
  testScore?: number;
};

async function main() {
  console.log('Seeding FSP IT Career...');

  await prisma.offer.deleteMany();
  await prisma.application.deleteMany();
  await prisma.match.deleteMany();
  await prisma.resumeAnalysis.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.challengeAnswer.deleteMany();
  await prisma.challengeAttemptQuestion.deleteMany();
  await prisma.challengeAttempt.deleteMany();
  await prisma.challengeQuestion.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentAttemptQuestion.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessmentBlueprintSection.deleteMany();
  await prisma.assessmentBlueprint.deleteMany();
  await prisma.assessmentGradeThreshold.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.test.deleteMany();
  await prisma.fspAchievement.deleteMany();
  await prisma.fspResult.deleteMany();
  await prisma.fspCompetition.deleteMany();
  await prisma.fspParticipantDiscipline.deleteMany();
  await prisma.fspParticipant.deleteMany();
  await prisma.fspDiscipline.deleteMany();
  await prisma.candidateSkill.deleteMany();
  await prisma.vacancySkill.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.vacancy.deleteMany();
  await prisma.candidateCategory.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.privacySettings.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.city.deleteMany();

  const passwordHash = await bcrypt.hash('Demo123!', 12);

  // Taxonomy
  const industry = await prisma.industry.create({
    data: {
      name: INDUSTRY_IT.name,
      slug: INDUSTRY_IT.slug,
      description: INDUSTRY_IT.description,
      isActive: true,
    },
  });
  const specializationBySlug = new Map<string, string>();
  for (const s of SPECIALIZATIONS) {
    const row = await prisma.specialization.create({
      data: {
        industryId: industry.id,
        name: s.name,
        slug: s.slug,
        isActive: true,
      },
    });
    specializationBySlug.set(s.slug, row.id);
    for (const g of GRADES_FOR_CATEGORY) {
      await prisma.candidateCategory.create({
        data: {
          specializationId: row.id,
          grade: g as Grade,
          slug: `${s.slug}-${g.toLowerCase()}`,
          name: `${s.name} · ${GRADE_LABEL_RU[g]}`,
          isActive: true,
        },
      });
    }
  }
  console.log(`Taxonomy: 1 industry, ${specializationBySlug.size} specializations`);

  for (const s of SKILL_CATALOG) {
    await prisma.skill.create({
      data: {
        name: s.name,
        slug: skillSlug(s.name),
        category: s.category,
        aliases: s.aliases || [],
        isActive: true,
      },
    });
  }

  for (const c of CITY_CATALOG) {
    await prisma.city.create({
      data: {
        name: c.name,
        region: c.region,
        country: 'Россия',
        aliases: c.aliases || [],
        isActive: true,
      },
    });
  }

  const programming = await prisma.fspDiscipline.create({
    data: { code: 'programming', name: 'Программирование' },
  });
  const algorithmic = await prisma.fspDiscipline.create({
    data: { code: 'algorithmic', name: 'Алгоритмическое программирование' },
  });
  const product = await prisma.fspDiscipline.create({
    data: { code: 'product', name: 'Продуктовая разработка' },
  });

  const competitions = await Promise.all([
    prisma.fspCompetition.create({ data: { name: 'Чемпионат России по спортивному программированию', year: 2026, disciplineId: programming.id } }),
    prisma.fspCompetition.create({ data: { name: 'Кубок ФСП', year: 2025, disciplineId: algorithmic.id } }),
    prisma.fspCompetition.create({ data: { name: 'Открытый чемпионат ФСП', year: 2024, disciplineId: product.id } }),
    prisma.fspCompetition.create({ data: { name: 'Региональный этап ФСП', year: 2025, disciplineId: programming.id } }),
    prisma.fspCompetition.create({ data: { name: 'Финал ФСП — командный зачёт', year: 2026, disciplineId: algorithmic.id } }),
  ]);

  const fspPeople = [
    { externalId: 'fsp-001', name: 'Иван Петров' },
    { externalId: 'fsp-002', name: 'Анна Смирнова' },
    { externalId: 'fsp-003', name: 'Дмитрий Козлов' },
    { externalId: 'fsp-004', name: 'Елена Васильева' },
    { externalId: 'fsp-005', name: 'Артём Новиков' },
    { externalId: 'fsp-006', name: 'Мария Орлова' },
    { externalId: 'fsp-007', name: 'Сергей Морозов' },
    { externalId: 'fsp-008', name: 'Ольга Федорова' },
    { externalId: 'fsp-009', name: 'Никита Соколов' },
    { externalId: 'fsp-010', name: 'Алина Кузнецова' },
    { externalId: 'fsp-011', name: 'Павел Лебедев' },
    { externalId: 'fsp-012', name: 'Виктория Попова' },
  ];

  const participants: { id: string; externalId: string; name: string }[] = [];
  for (let i = 0; i < fspPeople.length; i++) {
    const p = await prisma.fspParticipant.create({
      data: {
        externalId: fspPeople[i].externalId,
        name: fspPeople[i].name,
        isDemo: true,
        roles: ['Участник'],
        ranks: i < 3 ? ['Кандидат в мастера'] : [],
        disciplines: {
          create: [{ disciplineId: i % 2 === 0 ? programming.id : algorithmic.id }],
        },
        results: {
          create: [
            {
              competitionId: competitions[i % competitions.length].id,
              place: 5 + (i % 20),
              status: i % 3 === 0 ? 'Победитель' : i % 3 === 1 ? 'Призёр' : 'Финалист',
            },
            ...(i % 2 === 0
              ? [{
                  competitionId: competitions[(i + 1) % competitions.length].id,
                  place: 10 + i,
                  status: 'Финалист',
                }]
              : []),
          ],
        },
      },
    });
    participants.push(p);
  }

  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@fsp-career.ru',
      passwordHash,
      firstName: 'Админ',
      lastName: 'Системы',
      role: UserRole.ADMIN,
      emailVerified: true,
      privacySettings: privacyCreate,
    },
  });

  // Employers
  const employersData = [
    { email: 'employer@fsp-career.ru', firstName: 'Алексей', lastName: 'Иванов', company: 'ООО «Технологии»', city: 'Москва' },
    { email: 'hr@cloudsoft.ru', firstName: 'Марина', lastName: 'Белова', company: 'CloudSoft', city: 'Санкт-Петербург' },
    { email: 'jobs@datapro.ru', firstName: 'Игорь', lastName: 'Савельев', company: 'DataPro', city: 'Казань' },
  ];

  const companies: { id: string; name: string }[] = [];
  for (const e of employersData) {
    const user = await prisma.user.create({
      data: {
        email: e.email,
        passwordHash,
        firstName: e.firstName,
        lastName: e.lastName,
        role: UserRole.EMPLOYER,
        emailVerified: true,
        privacySettings: privacyCreate,
        company: {
          create: {
            name: e.company,
            city: e.city,
            description: `IT-компания ${e.company}`,
            website: `https://example.ru`,
            onboardingCompleted: true,
          },
        },
      },
      include: { company: true },
    });
    companies.push(user.company!);
  }

  const candidates: CandSeed[] = [
    {
      email: 'candidate@fsp-career.ru',
      firstName: 'Иван',
      lastName: 'Петров',
      roleTitle: 'Backend Developer',
      grade: 'MIDDLE',
      experienceYears: 3,
      salaryFrom: 200000,
      salaryTo: 250000,
      workFormat: 'REMOTE',
      skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Git', 'Linux', 'REST API'],
      city: 'Москва',
      about: 'Backend-разработчик с опытом высоконагруженных API и результатами соревнований ФСП.',
      fspExternalId: 'fsp-001',
      achievements: [
        { title: 'Чемпионат России по спортивному программированию', discipline: 'Программирование', place: 12, year: 2026, status: 'Финалист' },
        { title: 'Кубок ФСП', discipline: 'Алгоритмическое программирование', place: 8, year: 2025, status: 'Призёр' },
      ],
      experiences: [
        { company: 'FinTech Labs', position: 'Backend Developer', yearsAgoStart: 3, yearsAgoEnd: 0, description: 'Разработка API на FastAPI, оптимизация PostgreSQL.' },
        { company: 'Startup Hub', position: 'Junior Python Developer', yearsAgoStart: 5, yearsAgoEnd: 3, description: 'Микросервисы и интеграции.' },
      ],
      education: { institution: 'МГТУ им. Баумана', degree: 'Бакалавр', field: 'Информатика', yearFrom: 2017, yearTo: 2021 },
      testScore: 86,
    },
    {
      email: 'anna.smirnova@fsp-career.ru',
      firstName: 'Анна',
      lastName: 'Смирнова',
      roleTitle: 'Frontend Developer',
      grade: 'MIDDLE',
      experienceYears: 4,
      salaryFrom: 180000,
      salaryTo: 230000,
      workFormat: 'HYBRID',
      skills: ['TypeScript', 'React', 'Next.js', 'JavaScript', 'Git', 'Jest'],
      city: 'Санкт-Петербург',
      about: 'Frontend-специалист, сильный UI и доступность.',
      fspExternalId: 'fsp-002',
      achievements: [
        { title: 'Открытый чемпионат ФСП', discipline: 'Продуктовая разработка', place: 5, year: 2024, status: 'Призёр' },
      ],
      experiences: [
        { company: 'UI Factory', position: 'Frontend Developer', yearsAgoStart: 4, description: 'React/Next.js продукты.' },
      ],
      education: { institution: 'СПбГУ', degree: 'Бакалавр', field: 'ПМИ', yearFrom: 2016, yearTo: 2020 },
      testScore: 91,
    },
    {
      email: 'dmitry.kozlov@fsp-career.ru',
      firstName: 'Дмитрий',
      lastName: 'Козлов',
      roleTitle: 'Fullstack Developer',
      grade: 'SENIOR',
      experienceYears: 6,
      salaryFrom: 280000,
      salaryTo: 350000,
      workFormat: 'REMOTE',
      skills: ['TypeScript', 'React', 'Node.js', 'NestJS', 'PostgreSQL', 'Docker'],
      city: 'Екатеринбург',
      about: 'Fullstack с упором на NestJS и React.',
      fspExternalId: 'fsp-003',
      achievements: [
        { title: 'Финал ФСП — командный зачёт', discipline: 'Алгоритмическое программирование', place: 4, year: 2026, status: 'Призёр' },
        { title: 'Региональный этап ФСП', discipline: 'Программирование', place: 2, year: 2025, status: 'Победитель' },
      ],
      testScore: 94,
    },
    {
      email: 'elena.v@fsp-career.ru',
      firstName: 'Елена',
      lastName: 'Васильева',
      roleTitle: 'DevOps Engineer',
      grade: 'SENIOR',
      experienceYears: 5,
      salaryFrom: 260000,
      salaryTo: 320000,
      workFormat: 'REMOTE',
      skills: ['Docker', 'Kubernetes', 'Linux', 'AWS', 'CI/CD', 'Python'],
      city: 'Новосибирск',
      about: 'DevOps, инфраструктура как код.',
      fspExternalId: 'fsp-004',
      achievements: [
        { title: 'Кубок ФСП', discipline: 'Программирование', place: 15, year: 2025, status: 'Финалист' },
      ],
      testScore: 88,
    },
    {
      email: 'artem.n@fsp-career.ru',
      firstName: 'Артём',
      lastName: 'Новиков',
      roleTitle: 'Data Scientist',
      grade: 'MIDDLE',
      experienceYears: 3,
      salaryFrom: 220000,
      salaryTo: 280000,
      workFormat: 'HYBRID',
      skills: ['Python', 'Pandas', 'NumPy', 'TensorFlow', 'PostgreSQL'],
      city: 'Москва',
      about: 'Data Science и прикладная аналитика.',
      fspExternalId: 'fsp-005',
      achievements: [
        { title: 'Чемпионат России по спортивному программированию', discipline: 'Алгоритмическое программирование', place: 18, year: 2026, status: 'Финалист' },
      ],
      testScore: 82,
    },
    {
      email: 'maria.o@fsp-career.ru',
      firstName: 'Мария',
      lastName: 'Орлова',
      roleTitle: 'ML Engineer',
      grade: 'SENIOR',
      experienceYears: 5,
      salaryFrom: 300000,
      salaryTo: 400000,
      workFormat: 'REMOTE',
      skills: ['Python', 'PyTorch', 'TensorFlow', 'Docker', 'FastAPI', 'Kubernetes'],
      city: 'Москва',
      about: 'ML Engineer: обучение и деплой моделей.',
      fspExternalId: 'fsp-006',
      achievements: [
        { title: 'Открытый чемпионат ФСП', discipline: 'Программирование', place: 7, year: 2024, status: 'Призёр' },
        { title: 'Кубок ФСП', discipline: 'Алгоритмическое программирование', place: 3, year: 2025, status: 'Победитель' },
      ],
      testScore: 95,
    },
    {
      email: 'sergey.m@fsp-career.ru',
      firstName: 'Сергей',
      lastName: 'Морозов',
      roleTitle: 'QA Engineer',
      grade: 'MIDDLE',
      experienceYears: 4,
      salaryFrom: 160000,
      salaryTo: 210000,
      workFormat: 'OFFICE',
      skills: ['Python', 'Pytest', 'JavaScript', 'Git', 'REST API'],
      city: 'Казань',
      about: 'Автоматизация тестирования API и UI.',
      fspExternalId: 'fsp-007',
      achievements: [
        { title: 'Региональный этап ФСП', discipline: 'Программирование', place: 20, year: 2025, status: 'Финалист' },
      ],
      testScore: 79,
    },
    {
      email: 'olga.f@fsp-career.ru',
      firstName: 'Ольга',
      lastName: 'Федорова',
      roleTitle: 'Embedded Developer',
      grade: 'MIDDLE',
      experienceYears: 4,
      salaryFrom: 190000,
      salaryTo: 240000,
      workFormat: 'OFFICE',
      skills: ['C++', 'C#', 'Linux', 'Git'],
      city: 'Томск',
      about: 'Embedded и системное ПО.',
      fspExternalId: 'fsp-008',
      achievements: [
        { title: 'Региональный этап ФСП', discipline: 'Программирование', place: 14, year: 2025, status: 'Финалист' },
        { title: 'Кубок ФСП', discipline: 'Программирование', place: 22, year: 2024, status: 'Участник' },
      ],
      testScore: 84,
    },
    {
      email: 'nikita.s@fsp-career.ru',
      firstName: 'Никита',
      lastName: 'Соколов',
      roleTitle: 'Backend Developer',
      grade: 'JUNIOR',
      experienceYears: 1.5,
      salaryFrom: 120000,
      salaryTo: 160000,
      workFormat: 'REMOTE',
      skills: ['Python', 'Django', 'PostgreSQL', 'Git', 'Docker'],
      city: 'Самара',
      about: 'Junior backend, быстро растущий профиль.',
      fspExternalId: 'fsp-009',
      achievements: [
        { title: 'Региональный этап ФСП', discipline: 'Программирование', place: 9, year: 2025, status: 'Призёр' },
      ],
      testScore: 74,
    },
    {
      email: 'alina.k@fsp-career.ru',
      firstName: 'Алина',
      lastName: 'Кузнецова',
      roleTitle: 'Mobile Developer',
      grade: 'MIDDLE',
      experienceYears: 3.5,
      salaryFrom: 200000,
      salaryTo: 260000,
      workFormat: 'HYBRID',
      skills: ['Kotlin', 'Swift', 'Flutter', 'Git', 'REST API'],
      city: 'Москва',
      about: 'Мобильная разработка iOS/Android.',
      fspExternalId: 'fsp-010',
      achievements: [
        { title: 'Открытый чемпионат ФСП', discipline: 'Продуктовая разработка', place: 11, year: 2024, status: 'Финалист' },
      ],
      testScore: 87,
    },
    {
      email: 'pavel.l@fsp-career.ru',
      firstName: 'Павел',
      lastName: 'Лебедев',
      roleTitle: 'System Administrator',
      grade: 'SENIOR',
      experienceYears: 7,
      salaryFrom: 180000,
      salaryTo: 230000,
      workFormat: 'OFFICE',
      skills: ['Linux', 'Docker', 'MySQL', 'AWS', 'CI/CD'],
      city: 'Уфа',
      about: 'Системный администратор и инфраструктура.',
      testScore: 80,
    },
    {
      email: 'victoria.p@fsp-career.ru',
      firstName: 'Виктория',
      lastName: 'Попова',
      roleTitle: 'Backend Developer',
      grade: 'SENIOR',
      experienceYears: 5,
      salaryFrom: 270000,
      salaryTo: 340000,
      workFormat: 'REMOTE',
      skills: ['Java', 'Spring', 'PostgreSQL', 'Kafka', 'Docker', 'Redis'],
      city: 'Москва',
      about: 'Java/Spring backend для финтех-систем.',
      fspExternalId: 'fsp-012',
      achievements: [
        { title: 'Чемпионат России по спортивному программированию', discipline: 'Программирование', place: 6, year: 2026, status: 'Призёр' },
      ],
      testScore: 90,
    },
  ];

  const test = await prisma.test.create({
    data: {
      title: 'Базовый технический тест',
      description: 'Демонстрационный тест компетенций',
      questions: {
        create: [
          { question: 'Что такое REST?', options: ['Архитектурный стиль', 'Язык', 'БД', 'ОС'], answer: 0 },
          { question: 'Для чего нужен индекс в БД?', options: ['Ускорение поиска', 'Шифрование', 'Логирование', 'UI'], answer: 0 },
          { question: 'Что делает Docker?', options: ['Контейнеризация приложений', 'Только CI', 'Только БД', 'Только UI'], answer: 0 },
          { question: 'PostgreSQL — это?', options: ['Реляционная СУБД', 'NoSQL', 'Кэш', 'Брокер'], answer: 0 },
        ],
      },
    },
  });

  const legacyTest = await prisma.test.create({
    data: {
      title: 'Python / Backend (legacy)',
      description: 'Устаревший тест — используйте Assessment Engine',
      questions: {
        create: [
          { question: 'Что такое FastAPI?', options: ['Web-фреймворк Python', 'СУБД', 'ОС', 'IDE'], answer: 0 },
          { question: 'Какой код HTTP означает «успешно»?', options: ['200', '404', '500', '301'], answer: 0 },
          { question: 'Redis чаще используют как?', options: ['Кэш / брокер', 'Основную файловую систему', 'Браузер', 'Компилятор'], answer: 0 },
        ],
      },
    },
  });

  const backendSpecId = specializationBySlug.get('backend-development');
  if (!backendSpecId) throw new Error('backend-development specialization missing');

  const backendAssessment = await prisma.assessment.create({
    data: {
      name: 'Техническое тестирование — Backend Development',
      description:
        'Оценка компетенций Backend: Python, FastAPI, SQL, HTTP, архитектура, Redis и Docker. Результат определяет рекомендуемый уровень и категорию специалиста.',
      industryId: industry.id,
      specializationId: backendSpecId,
      version: 1,
      status: AssessmentStatus.PUBLISHED,
      timeLimitSeconds: 1800,
      passingScore: 50,
      cooldownHours: 72,
      blueprints: {
        create: {
          name: 'Backend Blueprint v1',
          version: 1,
          sections: {
            create: [
              { skill: 'Python', weight: 0.25, questionCount: 5, required: true },
              { skill: 'FastAPI', weight: 0.2, questionCount: 4, required: true },
              { skill: 'SQL', weight: 0.2, questionCount: 4, required: true },
              { skill: 'HTTP', weight: 0.15, questionCount: 3, required: true },
              { skill: 'Architecture', weight: 0.1, questionCount: 2, required: true },
              { skill: 'Redis', weight: 0.05, questionCount: 2, required: true },
              { skill: 'Docker', weight: 0.05, questionCount: 2, required: true },
            ],
          },
        },
      },
      thresholds: {
        create: [
          { grade: Grade.INTERN, minScore: 0, maxScore: 49 },
          { grade: Grade.JUNIOR, minScore: 50, maxScore: 69 },
          { grade: Grade.MIDDLE, minScore: 70, maxScore: 84 },
          { grade: Grade.SENIOR, minScore: 85, maxScore: 100 },
        ],
      },
      questions: {
        create: BACKEND_QUESTIONS.map((q) => ({
          skill: q.skill,
          difficulty: q.difficulty as QuestionDifficulty,
          type: q.type as QuestionType,
          text: q.text,
          options: q.options,
          correctOptionIndexes: q.correctOptionIndexes,
          explanation: q.explanation,
          points: q.points,
          isActive: true,
        })),
      },
    },
  });
  console.log(`Assessment seeded: ${backendAssessment.name} (${BACKEND_QUESTIONS.length} questions)`);

  const skillByName = new Map(
    (await prisma.skill.findMany({ select: { id: true, name: true } })).map((s) => [s.name, s.id]),
  );
  let challengeCount = 0;
  for (const ch of CHALLENGE_SEEDS) {
    const specializationId = specializationBySlug.get(ch.specializationSlug);
    const skillId = skillByName.get(ch.skillName);
    if (!specializationId || !skillId) {
      throw new Error(`Challenge seed missing taxonomy: ${ch.title} (${ch.specializationSlug}/${ch.skillName})`);
    }
    await prisma.challenge.create({
      data: {
        title: ch.title,
        description: ch.description,
        specializationId,
        skillId,
        difficulty: ch.difficulty,
        status: ChallengeStatus.PUBLISHED,
        timeLimitSeconds: ch.timeLimitSeconds,
        maxAttempts: ch.maxAttempts,
        passingScore: ch.passingScore,
        publishedAt: new Date(),
        questions: {
          create: ch.questions.map((q, i) => ({
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correctOptionIndexes: q.correctOptionIndexes,
            points: q.points,
            sortOrder: i,
            isActive: true,
          })),
        },
      },
    });
    challengeCount += 1;
  }
  // One draft challenge must stay hidden from candidates
  await prisma.challenge.create({
    data: {
      title: 'DRAFT: внутренний черновик',
      description: 'Не должен быть виден кандидатам',
      specializationId: specializationBySlug.get('backend-development'),
      skillId: skillByName.get('Node.js'),
      difficulty: QuestionDifficulty.EASY,
      status: ChallengeStatus.DRAFT,
      timeLimitSeconds: 300,
      maxAttempts: 1,
      passingScore: 70,
      questions: {
        create: [
          {
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'Черновик не публикуется',
            options: ['Да', 'Нет'],
            correctOptionIndexes: [0],
            points: 1,
            sortOrder: 0,
          },
        ],
      },
    },
  });
  console.log(`Challenges seeded: ${challengeCount} published + 1 draft`);

  for (const c of candidates) {
    const years = (n: number) => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - n);
      return d;
    };

    const specSlug = mapRoleTitleToSpecializationSlug(c.roleTitle);
    const specializationId = specSlug ? specializationBySlug.get(specSlug) : undefined;
    const category =
      specializationId
        ? await prisma.candidateCategory.findUnique({
            where: { specializationId_grade: { specializationId, grade: c.grade } },
          })
        : null;
    const isBackend = specSlug === 'backend-development';
    const hasAssessment = c.testScore != null && isBackend;
    const recommended = hasAssessment && c.testScore != null ? recommendGradeFromThresholds(c.testScore) : null;
    const categoryForRecommended =
      hasAssessment && specializationId && recommended
        ? await prisma.candidateCategory.findUnique({
            where: { specializationId_grade: { specializationId, grade: recommended } },
          })
        : null;

    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash,
        firstName: c.firstName,
        lastName: c.lastName,
        role: UserRole.CANDIDATE,
        emailVerified: true,
        privacySettings: privacyCreate,
        candidateProfile: {
          create: {
            roleTitle: c.roleTitle,
            grade: c.grade,
            experienceYears: c.experienceYears,
            salaryFrom: c.salaryFrom,
            salaryTo: c.salaryTo,
            workFormat: c.workFormat,
            about: c.about,
            city: c.city,
            isVerified: true,
            onboardingCompleted: true,
            fspParticipantId: c.fspExternalId,
            industryId: industry.id,
            specializationId: specializationId ?? null,
            candidateCategoryId: categoryForRecommended?.id ?? (hasAssessment ? null : category?.id ?? null),
            recommendedGrade: recommended,
            // AVAILABLE only with real assessment result (Wave C)
            profileStatus: hasAssessment ? ProfileStatus.AVAILABLE : ProfileStatus.ASSESSMENT_REQUIRED,
          },
        },
      },
      include: { candidateProfile: true },
    });

    const profileId = user.candidateProfile!.id;

    for (const skillName of c.skills) {
      const skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (!skill) continue;
      await prisma.candidateSkill.create({
        data: { candidateId: profileId, skillId: skill.id, level: 3 + Math.floor(Math.random() * 2) },
      });
    }

    if (c.experiences) {
      for (const exp of c.experiences) {
        await prisma.experience.create({
          data: {
            candidateId: profileId,
            company: exp.company,
            position: exp.position,
            description: exp.description,
            startDate: years(exp.yearsAgoStart),
            endDate: exp.yearsAgoEnd === 0 || exp.yearsAgoEnd == null ? null : years(exp.yearsAgoEnd),
            isCurrent: exp.yearsAgoEnd === 0 || exp.yearsAgoEnd == null,
          },
        });
      }
    }

    if (c.education) {
      await prisma.education.create({
        data: {
          candidateId: profileId,
          institution: c.education.institution,
          degree: c.education.degree,
          field: c.education.field,
          yearFrom: c.education.yearFrom,
          yearTo: c.education.yearTo,
        },
      });
    }

    if (c.achievements) {
      for (const a of c.achievements) {
        await prisma.fspAchievement.create({
          data: {
            candidateId: profileId,
            title: a.title,
            discipline: a.discipline,
            place: a.place,
            year: a.year,
            status: a.status,
            isDemo: true,
            source: FspAchievementSource.DEMO,
          },
        });
      }
    }

    if (hasAssessment && c.testScore != null && recommended) {
      const passed = c.testScore >= 50;
      const startedAt = new Date(Date.now() - 40 * 60 * 1000);
      const submittedAt = new Date(Date.now() - 10 * 60 * 1000);
      const attempt = await prisma.assessmentAttempt.create({
        data: {
          candidateId: profileId,
          assessmentId: backendAssessment.id,
          assessmentVersion: 1,
          startedAt,
          expiresAt: new Date(startedAt.getTime() + 1800 * 1000),
          submittedAt,
          status: AttemptStatus.SUBMITTED,
          score: c.testScore,
          correctAnswers: Math.round((c.testScore / 100) * 22),
          totalQuestions: 22,
          recommendedGrade: recommended,
          selfDeclaredGrade: c.grade,
        },
      });
      await prisma.assessmentResult.create({
        data: {
          attemptId: attempt.id,
          candidateId: profileId,
          assessmentId: backendAssessment.id,
          assessmentVersion: 1,
          score: c.testScore,
          status: passed ? AssessmentResultStatus.PASSED : AssessmentResultStatus.FAILED,
          recommendedGrade: recommended,
          selfDeclaredGrade: c.grade,
          candidateCategoryId: categoryForRecommended?.id ?? null,
          sectionScores: {
            Python: c.testScore,
            FastAPI: c.testScore,
            SQL: c.testScore,
            HTTP: c.testScore,
            Architecture: Math.max(0, c.testScore - 5),
            Redis: c.testScore,
            Docker: c.testScore,
          },
        },
      });
      // Keep legacy row only as historical mirror (not source of truth)
      await prisma.testAttempt.create({
        data: {
          testId: legacyTest.id,
          candidateId: profileId,
          score: c.testScore,
          maxScore: 100,
        },
      });
    }
  }

  const vacancies = [
    {
      companyId: companies[0].id,
      title: 'Backend Developer',
      roleTitle: 'Backend Developer',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 2,
      experienceTo: 5,
      salaryFrom: 200000,
      salaryTo: 250000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'Разработка backend-сервисов на Python/FastAPI.',
      requirements: 'Опыт от 2 лет. Python, FastAPI, PostgreSQL.',
      technologies: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
    },
    {
      companyId: companies[0].id,
      title: 'Frontend Developer',
      roleTitle: 'Frontend Developer',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 2,
      salaryFrom: 180000,
      salaryTo: 230000,
      workFormat: 'HYBRID' as WorkFormat,
      description: 'Разработка клиентских приложений.',
      requirements: 'React, TypeScript.',
      technologies: ['TypeScript', 'React', 'Next.js'],
    },
    {
      companyId: companies[0].id,
      title: 'DevOps Engineer',
      roleTitle: 'DevOps Engineer',
      grade: 'SENIOR' as Grade,
      experienceFrom: 4,
      salaryFrom: 250000,
      salaryTo: 320000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'Инфраструктура и CI/CD.',
      requirements: 'Kubernetes, Docker.',
      technologies: ['Docker', 'Kubernetes', 'Linux', 'CI/CD'],
    },
    {
      companyId: companies[1].id,
      title: 'Fullstack Developer',
      roleTitle: 'Fullstack Developer',
      grade: 'SENIOR' as Grade,
      experienceFrom: 4,
      salaryFrom: 280000,
      salaryTo: 360000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'Fullstack продукт.',
      requirements: 'NestJS + React.',
      technologies: ['TypeScript', 'NestJS', 'React', 'PostgreSQL'],
    },
    {
      companyId: companies[1].id,
      title: 'ML Engineer',
      roleTitle: 'ML Engineer',
      grade: 'SENIOR' as Grade,
      experienceFrom: 3,
      salaryFrom: 300000,
      salaryTo: 400000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'ML в продакшене.',
      requirements: 'PyTorch, FastAPI.',
      technologies: ['Python', 'PyTorch', 'FastAPI', 'Docker'],
    },
    {
      companyId: companies[1].id,
      title: 'QA Engineer',
      roleTitle: 'QA Engineer',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 2,
      salaryFrom: 150000,
      salaryTo: 200000,
      workFormat: 'OFFICE' as WorkFormat,
      description: 'Автотесты.',
      requirements: 'Pytest, API testing.',
      technologies: ['Python', 'Pytest', 'REST API'],
    },
    {
      companyId: companies[2].id,
      title: 'Data Scientist',
      roleTitle: 'Data Scientist',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 2,
      salaryFrom: 210000,
      salaryTo: 270000,
      workFormat: 'HYBRID' as WorkFormat,
      description: 'Аналитика и модели.',
      requirements: 'Pandas, ML basics.',
      technologies: ['Python', 'Pandas', 'NumPy', 'TensorFlow'],
    },
    {
      companyId: companies[2].id,
      title: 'Mobile Developer',
      roleTitle: 'Mobile Developer',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 2,
      salaryFrom: 190000,
      salaryTo: 250000,
      workFormat: 'HYBRID' as WorkFormat,
      description: 'Мобильные приложения.',
      requirements: 'Kotlin/Swift/Flutter.',
      technologies: ['Kotlin', 'Swift', 'Flutter'],
    },
    {
      companyId: companies[2].id,
      title: 'Embedded Developer',
      roleTitle: 'Embedded Developer',
      grade: 'MIDDLE' as Grade,
      experienceFrom: 3,
      salaryFrom: 180000,
      salaryTo: 240000,
      workFormat: 'OFFICE' as WorkFormat,
      description: 'Встраиваемые системы.',
      requirements: 'C/C++.',
      technologies: ['C++', 'Linux'],
    },
    {
      companyId: companies[0].id,
      title: 'Junior Backend Developer',
      roleTitle: 'Backend Developer',
      grade: 'JUNIOR' as Grade,
      experienceFrom: 0.5,
      experienceTo: 2,
      salaryFrom: 100000,
      salaryTo: 150000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'Старт в backend-команде.',
      requirements: 'Python, основы SQL.',
      technologies: ['Python', 'Django', 'PostgreSQL'],
    },
    {
      companyId: companies[1].id,
      title: 'Java Backend Developer',
      roleTitle: 'Backend Developer',
      grade: 'SENIOR' as Grade,
      experienceFrom: 4,
      salaryFrom: 270000,
      salaryTo: 350000,
      workFormat: 'REMOTE' as WorkFormat,
      description: 'Высоконагруженный Java backend.',
      requirements: 'Spring, Kafka.',
      technologies: ['Java', 'Spring', 'PostgreSQL', 'Kafka', 'Redis'],
    },
  ];

  const createdVacancies: { id: string; roleTitle: string }[] = [];
  for (const v of vacancies) {
    const { technologies, ...data } = v;
    const specSlug = mapRoleTitleToSpecializationSlug(data.roleTitle);
    const vacancy = await prisma.vacancy.create({
      data: {
        ...data,
        industryId: industry.id,
        specializationId: specSlug ? specializationBySlug.get(specSlug) ?? null : null,
      },
    });
    createdVacancies.push({ id: vacancy.id, roleTitle: data.roleTitle });
    for (const name of technologies) {
      const skill = await prisma.skill.findUnique({ where: { name } });
      if (!skill) continue;
      await prisma.vacancySkill.create({ data: { vacancyId: vacancy.id, skillId: skill.id } });
    }
  }

  // Demo Applications (AVAILABLE backend candidates → backend vacancies)
  const availableBackend = await prisma.candidateProfile.findMany({
    where: {
      profileStatus: ProfileStatus.AVAILABLE,
      specialization: { slug: 'backend-development' },
    },
    take: 4,
  });
  const backendVacancyIds = createdVacancies
    .filter((v) => mapRoleTitleToSpecializationSlug(v.roleTitle) === 'backend-development')
    .map((v) => v.id);
  const appStatuses = [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.REVIEWING,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
  ];
  for (let i = 0; i < availableBackend.length && i < backendVacancyIds.length; i++) {
    await prisma.application.create({
      data: {
        candidateId: availableBackend[i].id,
        vacancyId: backendVacancyIds[i % backendVacancyIds.length],
        status: appStatuses[i % appStatuses.length],
        coverLetter: 'Демонстрационный отклик на вакансию.',
        reviewedAt:
          appStatuses[i % appStatuses.length] === ApplicationStatus.SUBMITTED ? null : new Date(),
      },
    });
  }

  const achievementCount = await prisma.fspAchievement.count();

  // AVAILABLE integrity: every AVAILABLE candidate must have PASSED assessment + category + recommendedGrade
  const available = await prisma.candidateProfile.findMany({
    where: { profileStatus: ProfileStatus.AVAILABLE },
    include: {
      user: true,
      assessmentResults: { where: { status: AssessmentResultStatus.PASSED } },
    },
  });
  for (const p of available) {
    if (!p.user.emailVerified) throw new Error(`AVAILABLE ${p.id} without emailVerified`);
    if (!p.specializationId) throw new Error(`AVAILABLE ${p.id} without specialization`);
    if (!p.candidateCategoryId) throw new Error(`AVAILABLE ${p.id} without category`);
    if (!p.recommendedGrade) throw new Error(`AVAILABLE ${p.id} without recommendedGrade`);
    if (!p.assessmentResults.length) throw new Error(`AVAILABLE ${p.id} without PASSED AssessmentResult`);
  }

  console.log(
    `Seed complete. Skills=${SKILL_CATALOG.length}, Cities=${CITY_CATALOG.length}, FSP participants=${participants.length}, achievements=${achievementCount}, vacancies=${vacancies.length}, challenges=${challengeCount}, AVAILABLE=${available.length} (integrity OK)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
