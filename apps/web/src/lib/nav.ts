export type NavItem = {
  href: string;
  label: string;
  short?: string;
  /** Группа в боковом меню */
  group?: string;
  /** Показывать в нижней мобильной навигации */
  mobile?: boolean;
};

export const employerNav: NavItem[] = [
  { href: '/employer/dashboard', label: 'Главная', short: 'Главная', mobile: true },
  { href: '/employer/search', label: 'Поиск специалистов', short: 'Поиск', group: 'НАЙТИ', mobile: true },
  { href: '/employer/vacancies', label: 'Вакансии', short: 'Вакансии', group: 'РАБОТА', mobile: true },
  { href: '/employer/applications', label: 'Отклики', short: 'Отклики', group: 'РАБОТА', mobile: true },
  { href: '/employer/offers', label: 'Предложения', short: 'Предлож.', group: 'РАБОТА', mobile: true },
  { href: '/employer/company', label: 'Компания', short: 'Компания', group: 'ПРОФИЛЬ' },
  { href: '/settings', label: 'Настройки', short: 'Ещё', group: 'ПРОФИЛЬ' },
  { href: '/support', label: 'Помощь', short: 'Помощь', group: 'ПРОФИЛЬ' },
];

export const candidateNav: NavItem[] = [
  { href: '/candidate/dashboard', label: 'Главная', short: 'Главная', mobile: true },
  { href: '/candidate/dashboard#vacancies', label: 'Вакансии', short: 'Вакансии', group: 'РАБОТА', mobile: true },
  { href: '/candidate/applications', label: 'Мои отклики', short: 'Отклики', group: 'РАБОТА', mobile: true },
  { href: '/candidate/dashboard#offers', label: 'Предложения', short: 'Предлож.', group: 'РАБОТА', mobile: true },
  { href: '/candidate/profile', label: 'Профиль', short: 'Профиль', group: 'ПРОФИЛЬ', mobile: true },
  { href: '/candidate/tests', label: 'Техническое тестирование', short: 'Тест', group: 'ПРОФИЛЬ' },
  { href: '/candidate/challenges', label: 'Технические задания', short: 'Задания', group: 'ПРОФИЛЬ' },
  { href: '/candidate/profile#achievements', label: 'Достижения ФСП', short: 'ФСП', group: 'ПРОФИЛЬ' },
  { href: '/settings', label: 'Настройки', short: 'Ещё', group: 'ПРОФИЛЬ' },
];

export const adminNav: NavItem[] = [
  { href: '/admin', label: 'Сводка', short: 'Сводка', mobile: true },
  { href: '/admin?tab=users', label: 'Пользователи', short: 'Люди', group: 'ДАННЫЕ', mobile: true },
  { href: '/admin?tab=vacancies', label: 'Вакансии', short: 'Вакансии', group: 'ДАННЫЕ', mobile: true },
  { href: '/admin?tab=achievements', label: 'Достижения ФСП', short: 'ФСП', group: 'ДАННЫЕ', mobile: true },
  { href: '/settings', label: 'Настройки', short: 'Ещё' },
];
