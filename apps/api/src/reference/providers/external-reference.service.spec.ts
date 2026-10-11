import { ExternalReferenceService } from '../external-reference.service';
import { ExternalReferenceProvider } from './reference-provider';

describe('ExternalReferenceService', () => {
  const prevRedis = process.env.REDIS_URL;

  beforeAll(() => {
    process.env.REFERENCE_CACHE = '0';
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    delete process.env.REFERENCE_CACHE;
    if (prevRedis) process.env.REDIS_URL = prevRedis;
  });

  const provider: ExternalReferenceProvider = {
    name: 'headhunter',
    searchSkills: jest.fn(async () => [
      { id: '1', label: 'Python', source: 'headhunter', type: 'skill' as const },
    ]),
    searchPositions: jest.fn(async () => []),
    searchCities: jest.fn(async () => []),
  };

  let service: ExternalReferenceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExternalReferenceService(provider);
  });

  it('does not call provider for queries shorter than 2 chars', async () => {
    const res = await service.searchSkills('p');
    expect(res.items).toEqual([]);
    expect(provider.searchSkills).not.toHaveBeenCalled();
  });

  it('returns provider items for valid query', async () => {
    const res = await service.searchSkills('py');
    expect(res.provider).toBe('headhunter');
    expect(res.items[0].label).toBe('Python');
    expect(provider.searchSkills).toHaveBeenCalledWith('py', 10);
  });
});
