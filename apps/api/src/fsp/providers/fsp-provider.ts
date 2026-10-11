export type FspProviderStatus = 'CONNECTED' | 'NOT_FOUND' | 'UNAVAILABLE';

export type FspParticipantView = {
  participantId: string;
  name: string;
  isDemo: boolean;
  notice: string;
  status: FspProviderStatus;
  disciplines: Array<{ id: string; name: string }>;
  competitions: Array<{ name: string; year: number; place: number | null; status: string }>;
  roles: string[];
  ranks: string[];
};

export type FspAchievementView = {
  title: string;
  discipline: string;
  place: number | null;
  year: number;
  status: string;
  source: 'FSP' | 'DEMO';
  isDemo: boolean;
};

export interface FspProvider {
  getStatus(participantId: string): Promise<FspProviderStatus>;
  getParticipant(participantId: string): Promise<FspParticipantView | null>;
  getAchievements(participantId: string): Promise<FspAchievementView[]>;
}

export const FSP_PROVIDER = Symbol('FSP_PROVIDER');
