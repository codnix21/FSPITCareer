import { api } from './api';
import type { SelectOption } from '@/components/searchable-select';

type ExternalRefResponse = {
  items: {
    id: string | null;
    label: string;
    source: string;
    type: string;
    meta?: Record<string, unknown>;
  }[];
  total: number;
  truncated?: boolean;
  provider?: string;
};

type LocalRefResponse = {
  items: { id: string; label: string; value: string; meta?: Record<string, unknown> }[];
  total: number;
  truncated?: boolean;
};

function mapExternal(res: ExternalRefResponse): SelectOption[] {
  return (res.items || []).map((i) => ({
    id: i.id || i.label,
    label: i.label,
    value: i.label,
    meta: {
      ...i.meta,
      source: i.source,
      type: i.type,
      externalId: i.id,
    },
  }));
}

function mapLocal(res: LocalRefResponse): SelectOption[] {
  return (res.items || []).map((i) => ({
    id: i.id,
    label: i.label,
    value: i.value,
    meta: i.meta,
  }));
}

/** External HH-backed autocomplete — does NOT write to DB */
export async function searchReferenceSkills(q: string, limit = 10): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await api<ExternalRefResponse>(`/reference/external/skills?${qs}`, { auth: false });
  return mapExternal(res);
}

export async function searchReferenceCities(q: string, limit = 10): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await api<ExternalRefResponse>(`/reference/external/cities?${qs}`, { auth: false });
  return mapExternal(res);
}

export async function searchReferencePositions(q: string, limit = 10): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await api<ExternalRefResponse>(`/reference/external/positions?${qs}`, { auth: false });
  return mapExternal(res);
}

export async function searchReferenceCompanies(q: string, limit = 10): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  try {
    const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
    const res = await api<ExternalRefResponse>(`/reference/external/companies?${qs}`, { auth: false });
    return mapExternal(res);
  } catch {
    const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
    const res = await api<LocalRefResponse>(`/reference/companies?${qs}`, { auth: false });
    return mapLocal(res);
  }
}

/** Local education levels (enum) */
export async function searchReferenceEducation(q: string, limit = 20): Promise<SelectOption[]> {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('limit', String(limit));
  const res = await api<LocalRefResponse>(`/reference/education?${qs}`, { auth: false });
  return mapLocal(res);
}

export async function searchEducationInstitutions(q: string, limit = 10): Promise<SelectOption[]> {
  if (q.trim().length < 2) return [];
  const qs = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  const res = await api<ExternalRefResponse>(`/reference/external/education-institutions?${qs}`, {
    auth: false,
  });
  return mapExternal(res);
}

export function optionFromValue(value: string, label?: string): SelectOption {
  return { id: value, label: label || value, value };
}
