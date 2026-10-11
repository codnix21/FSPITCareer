import { QuestionDifficulty, QuestionType } from '@prisma/client';

export type SeedChallengeQuestion = {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctOptionIndexes: number[];
  points: number;
};

export type SeedChallenge = {
  title: string;
  description: string;
  specializationSlug: string;
  skillName: string;
  difficulty: QuestionDifficulty;
  timeLimitSeconds: number;
  maxAttempts: number;
  passingScore: number;
  questions: SeedChallengeQuestion[];
};

export const CHALLENGE_SEEDS: SeedChallenge[] = [
  // Backend
  {
    title: 'Backend: HTTP и REST — базовый',
    description: 'Короткая проверка понимания HTTP-методов, статусов и идемпотентности.',
    specializationSlug: 'backend-development',
    skillName: 'REST API',
    difficulty: QuestionDifficulty.EASY,
    timeLimitSeconds: 600,
    maxAttempts: 3,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой HTTP-метод обычно используют для создания нового ресурса?',
        options: ['GET', 'POST', 'HEAD', 'OPTIONS'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой статус-код уместен при успешном создании ресурса?',
        options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой метод считается безопасным (safe) и не должен менять состояние сервера?',
        options: ['POST', 'PUT', 'GET', 'PATCH'],
        correctOptionIndexes: [2],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие методы обычно считают идемпотентными?',
        options: ['GET', 'PUT', 'DELETE', 'POST'],
        correctOptionIndexes: [0, 1, 2],
        points: 2,
      },
    ],
  },
  {
    title: 'Backend: PostgreSQL и транзакции',
    description: 'Проверка знаний SQL, индексов и уровней изоляции транзакций.',
    specializationSlug: 'backend-development',
    skillName: 'PostgreSQL',
    difficulty: QuestionDifficulty.MEDIUM,
    timeLimitSeconds: 900,
    maxAttempts: 2,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой индекс лучше подходит для поиска по уникальному email?',
        options: ['GiST', 'BRIN', 'B-tree UNIQUE', 'Hash только без unique'],
        correctOptionIndexes: [2],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Что делает COMMIT в PostgreSQL?',
        options: [
          'Откатывает текущую транзакцию',
          'Фиксирует изменения текущей транзакции',
          'Создаёт точку сохранения',
          'Блокирует таблицу навсегда',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой уровень изоляции в PostgreSQL является уровнем по умолчанию?',
        options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие утверждения верны для FOREIGN KEY?',
        options: [
          'Обеспечивает ссылочную целостность',
          'Всегда ускоряет SELECT без индекса',
          'Может каскадно удалять связанные строки',
          'Заменяет необходимость валидации на уровне приложения полностью',
        ],
        correctOptionIndexes: [0, 2],
        points: 2,
      },
    ],
  },
  {
    title: 'Backend: Node.js concurrency и ошибки',
    description: 'Сложные сценарии event loop, промисов и обработки ошибок.',
    specializationSlug: 'backend-development',
    skillName: 'Node.js',
    difficulty: QuestionDifficulty.HARD,
    timeLimitSeconds: 1200,
    maxAttempts: 1,
    passingScore: 75,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Что произойдёт, если в async-функции бросить ошибку без try/catch и без .catch у вызывающего?',
        options: [
          'Ошибка молча игнорируется',
          'Promise отклоняется (rejection)',
          'Процесс всегда завершается с кодом 0',
          'Ошибка превращается в синхронный throw в следующем тике всегда',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой примитив лучше использовать для ограничения параллелизма I/O-задач?',
        options: [
          'Бесконечный Promise.all без лимита',
          'Очередь/семафор (например p-limit)',
          'setInterval на 0 мс',
          'Синхронный while(true)',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'process.nextTick относительно Promise.then обычно выполняется:',
        options: [
          'После I/O callbacks, но до Promise microtasks',
          'До Promise microtasks (более высокий приоритет microtask)',
          'Только после setTimeout(0)',
          'Только в worker_threads',
        ],
        correctOptionIndexes: [1],
        points: 2,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие практики помогают избегать memory leaks в долгоживущем Node-сервисе?',
        options: [
          'Не копить неограниченные listeners на EventEmitter',
          'Закрывать таймеры и streams при shutdown',
          'Хранить все запросы в глобальном массиве без TTL',
          'Ограничивать размер кэшей',
        ],
        correctOptionIndexes: [0, 1, 3],
        points: 2,
      },
    ],
  },
  // Frontend
  {
    title: 'Frontend: React basics',
    description: 'Основы hooks, ключей списков и контролируемых компонентов.',
    specializationSlug: 'frontend-development',
    skillName: 'React',
    difficulty: QuestionDifficulty.EASY,
    timeLimitSeconds: 600,
    maxAttempts: 3,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Для чего нужен prop key в списке элементов?',
        options: [
          'Чтобы задать CSS-класс',
          'Чтобы помочь React сопоставлять элементы между рендерами',
          'Чтобы вызвать useEffect',
          'Чтобы отключить Strict Mode',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой hook хранит локальное состояние компонента?',
        options: ['useMemo', 'useState', 'useId', 'useDebugValue'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Контролируемый input в React получает value из:',
        options: ['DOM напрямую через document', 'props/state компонента', 'localStorage всегда', 'CSS variables'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие правила верны для hooks?',
        options: [
          'Вызывать только на верхнем уровне функции компонента',
          'Можно вызывать условно внутри if',
          'Не вызывать в обычных функциях вне компонента/custom hook',
          'Порядок вызовов должен быть стабильным между рендерами',
        ],
        correctOptionIndexes: [0, 2, 3],
        points: 2,
      },
    ],
  },
  {
    title: 'Frontend: TypeScript и типы UI',
    description: 'Типизация props, discriminated unions и безопасные API-ответы.',
    specializationSlug: 'frontend-development',
    skillName: 'TypeScript',
    difficulty: QuestionDifficulty.MEDIUM,
    timeLimitSeconds: 900,
    maxAttempts: 2,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Что делает оператор ? в типе { name?: string }?',
        options: [
          'Делает поле обязательным',
          'Делает поле опциональным',
          'Запрещает undefined',
          'Создаёт generic',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Discriminated union обычно различают по:',
        options: ['общему числовому индексу', 'общему literal-полю (например type)', 'any', 'Object.keys'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какой тип лучше для «значение или ошибка» без исключений?',
        options: ['any', 'unknown + сужение', 'Function', 'never всегда'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие практики повышают типобезопасность фронтенда?',
        options: [
          'Валидировать внешние JSON (zod/io-ts)',
          'Использовать any для всех API',
          'Типизировать props компонентов',
          'Избегать as в пользу сужения типов',
        ],
        correctOptionIndexes: [0, 2, 3],
        points: 2,
      },
    ],
  },
  {
    title: 'Frontend: производительность React',
    description: 'Мемоизация, reconciliation и избежание лишних рендеров.',
    specializationSlug: 'frontend-development',
    skillName: 'React',
    difficulty: QuestionDifficulty.HARD,
    timeLimitSeconds: 1200,
    maxAttempts: 1,
    passingScore: 75,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'React.memo помогает, когда:',
        options: [
          'Нужно отменить все эффекты',
          'Пропсы часто стабильны и рендер дорогой',
          'Нужно заменить ключи списка',
          'Нужно форсировать SSR',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Новый объект inline в props (style={{}}) при каждом рендере:',
        options: [
          'Всегда улучшает производительность',
          'Может ломать memo-сравнение по ссылке',
          'Игнорируется React',
          'Компилируется в CSS-модуль',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Что уместно для снижения лишних рендеров?',
        options: [
          'Стабилизировать колбэки (useCallback) при реальной необходимости',
          'Поднимать state как можно выше всегда без причины',
          'Разбивать крупные компоненты',
          'Избегать лишних Context value-объектов без мемоизации',
        ],
        correctOptionIndexes: [0, 2, 3],
        points: 2,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'useTransition полезен, когда:',
        options: [
          'Нужно заменить CSS transitions',
          'Нужно пометить обновление UI как низкоприоритетное',
          'Нужно отменить HTTP-запрос',
          'Нужно синхронно блокировать main thread',
        ],
        correctOptionIndexes: [1],
        points: 2,
      },
    ],
  },
  // DevOps
  {
    title: 'DevOps: Docker fundamentals',
    description: 'Образы, слои, volumes и базовые практики контейнеризации.',
    specializationSlug: 'devops',
    skillName: 'Docker',
    difficulty: QuestionDifficulty.EASY,
    timeLimitSeconds: 600,
    maxAttempts: 3,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Что описывает Dockerfile?',
        options: [
          'Кластер Kubernetes',
          'Инструкции сборки образа',
          'Правила firewall хоста',
          'Схему БД',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Какая директива задаёт команду по умолчанию при запуске контейнера?',
        options: ['FROM', 'COPY', 'CMD', 'LABEL'],
        correctOptionIndexes: [2],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Volume в Docker обычно используют, чтобы:',
        options: [
          'Ускорить сборку без кэша',
          'Сохранять данные вне жизненного цикла контейнера',
          'Заменить сеть',
          'Удалить слои образа',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие практики уменьшают размер образа?',
        options: [
          'Multi-stage build',
          'Копировать весь репозиторий без .dockerignore',
          'Использовать slim/alpine базовые образы осознанно',
          'Объединять RUN с очисткой кэша пакетного менеджера',
        ],
        correctOptionIndexes: [0, 2, 3],
        points: 2,
      },
    ],
  },
  {
    title: 'DevOps: Kubernetes и CI/CD',
    description: 'Поды, Deployments, healthchecks и пайплайны доставки.',
    specializationSlug: 'devops',
    skillName: 'Kubernetes',
    difficulty: QuestionDifficulty.MEDIUM,
    timeLimitSeconds: 900,
    maxAttempts: 2,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Минимальная единица планирования в Kubernetes — это:',
        options: ['Node', 'Pod', 'Namespace', 'Ingress'],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Deployment управляет:',
        options: [
          'Только ConfigMap',
          'ReplicaSet и желаемым числом реплик Pod',
          'Только PersistentVolume',
          'Только ServiceAccount tokens',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'livenessProbe нужен, чтобы:',
        options: [
          'Проверять готовность принимать трафик (readiness)',
          'Перезапускать контейнер при зависании приложения',
          'Выдавать TLS-сертификаты',
          'Масштабировать HPA по CPU всегда',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Что обычно входит в зрелый CI/CD для контейнеров?',
        options: [
          'Сборка и публикация образа',
          'Сканирование уязвимостей образа',
          'Хранение секретов в git в открытом виде',
          'Деплой через манифесты/Helm с approval на prod',
        ],
        correctOptionIndexes: [0, 1, 3],
        points: 2,
      },
    ],
  },
  // QA
  {
    title: 'QA: основы тестирования',
    description: 'Пирамида тестирования, типы тестов и критерии качества.',
    specializationSlug: 'qa-testing',
    skillName: 'Jest',
    difficulty: QuestionDifficulty.EASY,
    timeLimitSeconds: 600,
    maxAttempts: 3,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Unit-тест проверяет:',
        options: [
          'Всю систему end-to-end через UI',
          'Небольшой изолированный модуль/функцию',
          'Только производительность сети',
          'Только доступность CDN',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Что обычно находится на вершине пирамиды тестирования (меньше всего)?',
        options: ['Unit', 'Integration', 'E2E/UI', 'Static analysis'],
        correctOptionIndexes: [2],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Regression-тест нужен, чтобы:',
        options: [
          'Проверить, что старые дефекты/поведение не вернулись',
          'Заменить code review',
          'Измерить NPS пользователей',
          'Сгенерировать fake data',
        ],
        correctOptionIndexes: [0],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Какие свойства хорошего автотеста?',
        options: [
          'Детерминизм',
          'Независимость от порядка запуска',
          'Зависимость от ручного клика в IDE',
          'Понятный assert с сообщением',
        ],
        correctOptionIndexes: [0, 1, 3],
        points: 2,
      },
    ],
  },
  {
    title: 'QA: Playwright и E2E',
    description: 'Селекторы, изоляция, ожидания и стабильность UI-тестов.',
    specializationSlug: 'qa-testing',
    skillName: 'Playwright',
    difficulty: QuestionDifficulty.MEDIUM,
    timeLimitSeconds: 900,
    maxAttempts: 2,
    passingScore: 70,
    questions: [
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Почему хрупки селекторы вида div > div:nth-child(3)?',
        options: [
          'Они слишком быстрые',
          'Ломаются при небольших изменениях вёрстки',
          'Не поддерживаются браузерами',
          'Запрещены Playwright',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Предпочтительный способ ждать появления элемента в Playwright:',
        options: [
          'sleep(5000) всегда',
          'Автоожидания/expect(locator).toBeVisible()',
          'Бесконечный while без timeout',
          'Только screenshot diff',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.SINGLE_CHOICE,
        prompt: 'Изоляция тестов означает:',
        options: [
          'Общий mutable state между всеми тестами обязателен',
          'Тесты не зависят друг от друга и от порядка',
          'Один браузер на всю CI-farm без cleanup',
          'Только manual QA',
        ],
        correctOptionIndexes: [1],
        points: 1,
      },
      {
        type: QuestionType.MULTIPLE_CHOICE,
        prompt: 'Что повышает стабильность E2E?',
        options: [
          'data-testid / role-based локаторы',
          'Фиксированные тестовые данные/фикстуры',
          'Зависимость от анимаций без ожидания',
          'Ретраи только flaky-тестов с разбором причин',
        ],
        correctOptionIndexes: [0, 1, 3],
        points: 2,
      },
    ],
  },
];
