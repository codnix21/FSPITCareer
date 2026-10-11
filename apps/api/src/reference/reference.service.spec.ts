import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  const prisma = {
    skill: {
      findMany: jest.fn(),
    },
    city: {
      findMany: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
    },
  } as any;

  const service = new ReferenceService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches skills by name and aliases', async () => {
    prisma.skill.findMany.mockResolvedValue([
      { id: '1', name: 'Python', slug: 'python', category: 'language', aliases: ['питон', 'py'] },
      { id: '2', name: 'Java', slug: 'java', category: 'language', aliases: [] },
    ]);

    const byAlias = await service.searchSkills('питон', 20);
    expect(byAlias.items).toHaveLength(1);
    expect(byAlias.items[0].label).toBe('Python');
    expect(byAlias.items[0].value).toBe('Python');

    const byPrefix = await service.searchSkills('py', 20);
    expect(byPrefix.items.some((i) => i.label === 'Python')).toBe(true);
  });

  it('searches cities', async () => {
    prisma.city.findMany.mockResolvedValue([
      { id: 'c1', name: 'Иркутск', region: 'Иркутская область', country: 'Россия', aliases: ['ирк'] },
      { id: 'c2', name: 'Москва', region: 'Москва', country: 'Россия', aliases: ['мск'] },
    ]);

    const res = await service.searchCities('иркут', 20);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].value).toBe('Иркутск');
  });

  it('searches positions without DB', () => {
    const res = service.searchPositions('backend', 20);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].value).toContain('Backend');
  });
});
