export type ExternalReferenceType = 'skill' | 'position' | 'city' | 'company' | 'education_institution';

export type ExternalReferenceItem = {
  /** External provider id when available; null if provider has no stable id */
  id: string | null;
  label: string;
  source: string;
  type: ExternalReferenceType;
  meta?: Record<string, unknown>;
};

export type ExternalReferenceList = {
  items: ExternalReferenceItem[];
  total: number;
  truncated: boolean;
  provider: string;
};

export interface ExternalReferenceProvider {
  readonly name: string;
  searchSkills(query: string, limit?: number): Promise<ExternalReferenceItem[]>;
  searchPositions(query: string, limit?: number): Promise<ExternalReferenceItem[]>;
  searchCities(query: string, limit?: number): Promise<ExternalReferenceItem[]>;
  searchCompanies?(query: string, limit?: number): Promise<ExternalReferenceItem[]>;
  searchEducationInstitutions?(query: string, limit?: number): Promise<ExternalReferenceItem[]>;
}

export const REFERENCE_PROVIDER = Symbol('REFERENCE_PROVIDER');
