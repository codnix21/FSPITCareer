import { LocalFspProvider } from './providers/local-fsp.provider';
import { ExternalFspProvider } from './providers/external-fsp.provider';
import { FspService } from './fsp.service';

describe('FSP provider abstraction', () => {
  it('LocalFspProvider returns NOT_FOUND for unknown id', async () => {
    const prisma = {
      fspParticipant: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const provider = new LocalFspProvider(prisma as any);
    expect(await provider.getStatus('missing')).toBe('NOT_FOUND');
    expect(await provider.getParticipant('missing')).toBeNull();
  });

  it('LocalFspProvider CONNECTED for demo participant', async () => {
    const prisma = {
      fspParticipant: {
        findFirst: jest.fn().mockResolvedValue({
          externalId: 'fsp-001',
          name: 'Demo',
          isDemo: true,
          roles: [],
          ranks: [],
          disciplines: [],
          results: [],
        }),
      },
    };
    const provider = new LocalFspProvider(prisma as any);
    expect(await provider.getStatus('fsp-001')).toBe('CONNECTED');
    const p = await provider.getParticipant('fsp-001');
    expect(p?.isDemo).toBe(true);
    expect(p?.notice).toContain('Демонстрационные данные');
  });

  it('ExternalFspProvider UNAVAILABLE without URL', async () => {
    const prev = process.env.FSP_EXTERNAL_URL;
    delete process.env.FSP_EXTERNAL_URL;
    const provider = new ExternalFspProvider();
    expect(await provider.getStatus('x')).toBe('UNAVAILABLE');
    expect(await provider.getAchievements('x')).toEqual([]);
    if (prev) process.env.FSP_EXTERNAL_URL = prev;
  });

  it('safeAchievements does not throw on UNAVAILABLE', async () => {
    const provider = {
      getStatus: jest.fn().mockResolvedValue('UNAVAILABLE'),
      getParticipant: jest.fn(),
      getAchievements: jest.fn(),
    };
    const prisma = { fspParticipant: {}, fspAchievement: {} };
    const audit = { log: jest.fn() };
    const service = new FspService(prisma as any, provider as any, audit as any);
    const res = await service.safeAchievements('any');
    expect(res.status).toBe('UNAVAILABLE');
    expect(res.items).toEqual([]);
    expect(await service.matchingFspCount('any')).toBe(0);
  });

  it('demo notice must not claim verified FSP sync', () => {
    const notice =
      'Демонстрационные данные ФСП. Это не подтверждённая синхронизация с официальным реестром.';
    expect(notice.toLowerCase()).not.toContain('подтверждено фсп');
    expect(notice).toContain('Демонстрационные');
  });
});
