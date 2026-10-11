import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import {
  ExternalReferenceItem,
  ExternalReferenceList,
  ExternalReferenceProvider,
  ExternalReferenceType,
  REFERENCE_PROVIDER,
} from './providers/reference-provider';

@Injectable()
export class ExternalReferenceService {
  private readonly logger = new Logger(ExternalReferenceService.name);
  private redis: Redis | null = null;
  private readonly cacheTtlSec = Number(process.env.HH_CACHE_TTL_SEC || 600);
  private memoryCache = new Map<string, { exp: number; value: ExternalReferenceList }>();

  constructor(@Inject(REFERENCE_PROVIDER) private readonly provider: ExternalReferenceProvider) {
    const url = process.env.REDIS_URL;
    if (!url || process.env.REFERENCE_CACHE === '0') return;
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 400,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      this.redis.on('error', () => {
        /* optional cache */
      });
    } catch {
      this.redis = null;
    }
  }

  searchSkills(q: string, limit = 10) {
    return this.search('skill', q, limit, (query, lim) => this.provider.searchSkills(query, lim));
  }

  searchPositions(q: string, limit = 10) {
    return this.search('position', q, limit, (query, lim) => this.provider.searchPositions(query, lim));
  }

  searchCities(q: string, limit = 10) {
    return this.search('city', q, limit, (query, lim) => this.provider.searchCities(query, lim));
  }

  searchCompanies(q: string, limit = 10) {
    if (!this.provider.searchCompanies) {
      throw new ServiceUnavailableException('Подсказки компаний недоступны у текущего provider');
    }
    return this.search('company', q, limit, (query, lim) => this.provider.searchCompanies!(query, lim));
  }

  searchEducationInstitutions(q: string, limit = 10) {
    if (!this.provider.searchEducationInstitutions) {
      throw new ServiceUnavailableException('Подсказки учебных заведений недоступны у текущего provider');
    }
    return this.search('education_institution', q, limit, (query, lim) =>
      this.provider.searchEducationInstitutions!(query, lim),
    );
  }

  private async search(
    type: ExternalReferenceType,
    q: string,
    limit: number,
    fn: (query: string, limit: number) => Promise<ExternalReferenceItem[]>,
  ): Promise<ExternalReferenceList> {
    const query = (q || '').trim();
    const capped = Math.min(Math.max(limit || 10, 1), 20);

    if (query.length < 2) {
      return { items: [], total: 0, truncated: false, provider: this.provider.name };
    }

    const cacheKey = `reference:${this.provider.name}:${type}:${query.toLowerCase()}:${capped}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const items = await fn(query, capped);
      const result: ExternalReferenceList = {
        items,
        total: items.length,
        truncated: items.length >= capped,
        provider: this.provider.name,
      };
      await this.setCache(cacheKey, result);
      return result;
    } catch (err) {
      this.logger.warn(`External ${type} search failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Не удалось загрузить подсказки');
    }
  }

  private async getCache(key: string): Promise<ExternalReferenceList | null> {
    const mem = this.memoryCache.get(key);
    if (mem && mem.exp > Date.now()) return mem.value;

    if (!this.redis) return null;
    try {
      const raw = await Promise.race([
        this.redis.get(key),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ]);
      if (!raw || typeof raw !== 'string') return null;
      return JSON.parse(raw) as ExternalReferenceList;
    } catch {
      this.redis = null;
      return null;
    }
  }

  private async setCache(key: string, value: ExternalReferenceList) {
    this.memoryCache.set(key, { exp: Date.now() + this.cacheTtlSec * 1000, value });
    if (this.memoryCache.size > 500) {
      const first = this.memoryCache.keys().next().value;
      if (first) this.memoryCache.delete(first);
    }
    if (!this.redis) return;
    try {
      await Promise.race([
        this.redis.set(key, JSON.stringify(value), 'EX', this.cacheTtlSec),
        new Promise<void>((resolve) => setTimeout(resolve, 300)),
      ]);
    } catch {
      this.redis = null;
    }
  }
}