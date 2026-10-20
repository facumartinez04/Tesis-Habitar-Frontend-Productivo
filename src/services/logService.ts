import type { LogFilters, LogKind } from '../types/log';

export const LOG_PAGE_SIZE = 25;

export const EMPTY_LOG_FILTERS: LogFilters = { q: '', from: '', to: '', type: '', institutionId: '' };

export function logsPath(kind: LogKind, filters: Omit<LogFilters, 'q'>, global: boolean): string {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (global && filters.institutionId) params.set('institutionId', filters.institutionId);
  const query = params.toString();
  return `/logs/${kind}${query ? `?${query}` : ''}`;
}

export function hasActiveFilters(filters: LogFilters): boolean {
  return Boolean(filters.q || filters.from || filters.to || filters.type || filters.institutionId);
}
