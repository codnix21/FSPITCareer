import { Injectable, Logger } from '@nestjs/common';
import {
  FspAchievementView,
  FspParticipantView,
  FspProvider,
  FspProviderStatus,
} from './fsp-provider';

/**
 * External FSP HTTP boundary. When FSP_EXTERNAL_URL is unset or request fails → UNAVAILABLE.
 * Does not throw into matching / profile paths.
 */
@Injectable()
export class ExternalFspProvider implements FspProvider {
  private readonly logger = new Logger(ExternalFspProvider.name);

  private baseUrl() {
    return (process.env.FSP_EXTERNAL_URL || '').replace(/\/$/, '');
  }

  async getStatus(participantId: string): Promise<FspProviderStatus> {
    if (!this.baseUrl()) return 'UNAVAILABLE';
    try {
      const res = await fetch(`${this.baseUrl()}/participants/${encodeURIComponent(participantId)}/status`, {
        signal: AbortSignal.timeout(Number(process.env.FSP_EXTERNAL_TIMEOUT_MS || 3000)),
      });
      if (res.status === 404) return 'NOT_FOUND';
      if (!res.ok) return 'UNAVAILABLE';
      const data = (await res.json()) as { status?: FspProviderStatus };
      return data.status || 'CONNECTED';
    } catch (e) {
      this.logger.warn(`FSP external status unavailable: ${(e as Error).message}`);
      return 'UNAVAILABLE';
    }
  }

  async getParticipant(participantId: string): Promise<FspParticipantView | null> {
    if (!this.baseUrl()) return null;
    try {
      const res = await fetch(`${this.baseUrl()}/participants/${encodeURIComponent(participantId)}`, {
        signal: AbortSignal.timeout(Number(process.env.FSP_EXTERNAL_TIMEOUT_MS || 3000)),
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = (await res.json()) as FspParticipantView;
      return { ...data, status: 'CONNECTED', isDemo: false, notice: data.notice || 'Данные участника ФСП.' };
    } catch (e) {
      this.logger.warn(`FSP external participant unavailable: ${(e as Error).message}`);
      return null;
    }
  }

  async getAchievements(participantId: string): Promise<FspAchievementView[]> {
    if (!this.baseUrl()) return [];
    try {
      const res = await fetch(
        `${this.baseUrl()}/participants/${encodeURIComponent(participantId)}/achievements`,
        { signal: AbortSignal.timeout(Number(process.env.FSP_EXTERNAL_TIMEOUT_MS || 3000)) },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as FspAchievementView[];
      return (data || []).map((a) => ({ ...a, source: 'FSP' as const, isDemo: false }));
    } catch (e) {
      this.logger.warn(`FSP external achievements unavailable: ${(e as Error).message}`);
      return [];
    }
  }
}
