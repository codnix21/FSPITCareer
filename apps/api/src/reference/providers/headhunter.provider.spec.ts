import { HeadHunterReferenceProvider } from './headhunter.provider';

describe('HeadHunterReferenceProvider', () => {
  const provider = new HeadHunterReferenceProvider();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps skill_set suggests without writing anything', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: '23153', text: 'Assembler' },
          { id: '1294844', text: 'AssertJ' },
        ],
      }),
    }) as any;

    const items = await provider.searchSkills('ass', 10);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: '23153', label: 'Assembler', source: 'headhunter', type: 'skill' });
    expect(items[1]).toMatchObject({ id: '1294844', label: 'AssertJ', source: 'headhunter', type: 'skill' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain('/suggests/skill_set');
    expect(String(url)).toContain('text=ass');
    expect(init.headers['HH-User-Agent']).toBeTruthy();
  });

  it('returns empty for short queries without calling HH', async () => {
    global.fetch = jest.fn();
    await expect(provider.searchSkills('a')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps areas with parent region meta', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: '35',
            text: 'Иркутск',
            parent: { id: '1124', text: 'Иркутская область' },
          },
        ],
      }),
    }) as any;

    const items = await provider.searchCities('иркут', 5);
    expect(items[0].label).toBe('Иркутск');
    expect(items[0].id).toBe('35');
    expect(items[0].meta).toEqual({ region: 'Иркутская область' });
  });
});
