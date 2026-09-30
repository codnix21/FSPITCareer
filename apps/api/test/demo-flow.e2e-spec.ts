/**
 * E2E сценарий:
 * login employer → create vacancy → search → send offer
 * → login candidate → see offer → accept offer
 */
describe('Demo flow e2e', () => {
  const enabled = !!process.env.E2E_DATABASE_URL;

  (enabled ? it : it.skip)('сквозной сценарий работодателя и кандидата', async () => {
    const base = process.env.E2E_API_URL || 'http://localhost:3001/api';

    const login = async (email: string, password: string) => {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(res.ok).toBe(true);
      return res.json();
    };

    const employer = await login('employer@fsp-career.ru', 'Demo123!');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employer.accessToken}`,
    };

    const vacancyRes = await fetch(`${base}/vacancies`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'E2E Backend Developer',
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        experienceFrom: 2,
        salaryFrom: 200000,
        salaryTo: 250000,
        workFormat: 'REMOTE',
        requirements: 'Опыт от 2 лет',
        technologies: ['Python', 'FastAPI', 'PostgreSQL'],
      }),
    });
    expect(vacancyRes.ok).toBe(true);
    const vacancy = await vacancyRes.json();

    const search = await fetch(`${base}/matching/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roleTitle: 'Backend Developer',
        grade: 'MIDDLE',
        technologies: ['Python', 'FastAPI', 'PostgreSQL'],
        salaryFrom: 180000,
        salaryTo: 260000,
        workFormat: 'REMOTE',
        vacancyId: vacancy.id,
      }),
    }).then((r) => r.json());

    expect(search.total).toBeGreaterThan(0);
    expect(search.items[0].matchScore).toBeGreaterThan(50);

    const candidate =
      search.items.find((i: any) => i.firstName === 'Иван' && i.lastName === 'Петров') || search.items[0];

    const offerRes = await fetch(`${base}/offers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vacancyId: vacancy.id,
        candidateUserId: candidate.userId,
        salary: 220000,
        message: 'Демо предложение E2E',
      }),
    });
    const offerBody = await offerRes.json();
    expect(offerRes.ok).toBe(true);

    const candAuth = await login('candidate@fsp-career.ru', 'Demo123!');
    const offers = await fetch(`${base}/offers`, {
      headers: { Authorization: `Bearer ${candAuth.accessToken}` },
    }).then((r) => r.json());
    expect(offers.items.some((o: any) => o.id === offerBody.id)).toBe(true);

    const accept = await fetch(`${base}/offers/${offerBody.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candAuth.accessToken}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    expect(accept.ok).toBe(true);
  });
});
