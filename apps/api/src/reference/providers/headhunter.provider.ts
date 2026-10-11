import { Injectable, Logger } from '@nestjs/common';
import {
  ExternalReferenceItem,
  ExternalReferenceProvider,
  ExternalReferenceType,
} from './reference-provider';

type HhSuggestItem = {
  id?: string | number | null;
  text?: string;
  name?: string;
  parent?: { text?: string; id?: string };
  area?: { name?: string; id?: string };
  acronym?: string | null;
};

@Injectable()
export class HeadHunterReferenceProvider implements ExternalReferenceProvider {
  readonly name = 'headhunter';
  private readonly logger = new Logger(HeadHunterReferenceProvider.name);
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor() {
    this.baseUrl = (process.env.HH_API_BASE_URL || 'https://api.hh.ru').replace(/\/$/, '');
    this.userAgent =
      process.env.HH_USER_AGENT ||
      'FSP IT Career/1.0 (https://github.com/fsp-it-career; contact@fsp-career.ru)';
  }

  searchSkills(query: string, limit = 10): Promise<ExternalReferenceItem[]> {
    return this.fetchSuggest('skill_set', query, 'skill', limit);
  }

  async searchPositions(query: string, limit = 10): Promise<ExternalReferenceItem[]> {
    const fromPositions = await this.fetchSuggest('positions', query, 'position', limit);
    if (fromPositions.length > 0) return fromPositions;
    // Official fallback within HH API when positions suggest is empty (e.g. Latin-only queries)
    return this.fetchSuggest('professional_roles', query, 'position', limit);
  }

  searchCities(query: string, limit = 10): Promise<ExternalReferenceItem[]> {
    return this.fetchSuggest('areas', query, 'city', limit, (item) => {
      const parent = item.parent?.text;
      return {
        label: item.text || item.name || '',
        meta: parent ? { region: parent } : undefined,
      };
    });
  }

  searchCompanies(query: string, limit = 10): Promise<ExternalReferenceItem[]> {
    return this.fetchSuggest('companies', query, 'company', limit, (item) => ({
      label: item.text || item.name || '',
      meta: item.area?.name ? { city: item.area.name } : undefined,
    }));
  }

  searchEducationInstitutions(query: string, limit = 10): Promise<ExternalReferenceItem[]> {
    return this.fetchSuggest('educational_institutions', query, 'education_institution', limit, (item) => ({
      label: item.text || item.name || '',
      meta: {
        ...(item.acronym ? { acronym: item.acronym } : {}),
        ...(item.area?.name ? { city: item.area.name } : {}),
      },
    }));
  }

  private async fetchSuggest(
    path: string,
    query: string,
    type: ExternalReferenceType,
    limit: number,
    mapExtra?: (item: HhSuggestItem) => { label?: string; meta?: Record<string, unknown> },
  ): Promise<ExternalReferenceItem[]> {
    const text = query.trim();
    if (text.length < 2) return [];

    const url = new URL(`${this.baseUrl}/suggests/${path}`);
    url.searchParams.set('text', text);
    url.searchParams.set('locale', 'RU');

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
          'HH-User-Agent': this.userAgent,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`HH ${path} failed: ${res.status} ${body.slice(0, 200)}`);
        throw new Error(`HeadHunter API error ${res.status}`);
      }

      const data = (await res.json()) as { items?: HhSuggestItem[] };
      const items = Array.isArray(data.items) ? data.items : [];

      return items.slice(0, Math.min(Math.max(limit, 1), 20)).map((raw) => {
        const extra = mapExtra?.(raw) || {};
        const label = (extra.label || raw.text || raw.name || '').trim();
        const id =
          raw.id === undefined || raw.id === null || raw.id === ''
            ? null
            : String(raw.id);

        return {
          id,
          label,
          source: this.name,
          type,
          meta: extra.meta,
        };
      }).filter((i) => i.label);
    } catch (err) {
      this.logger.warn(`HH ${path} request failed: ${(err as Error).message}`);
      throw err;
    }
  }
}
