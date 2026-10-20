import { apiFetch } from '../lib/apiClient';
import type { InstitutionAiCostDetail } from '../types/aiCost';

export type AiCostScope = 'admin' | 'institucion';

export function getInstitutionAiCosts(institutionId: string, scope: AiCostScope, month?: string): Promise<InstitutionAiCostDetail> {
  const base = scope === 'admin' ? `/admin/ai-costs/institutions/${institutionId}` : `/institutions/${institutionId}/ai-costs`;
  return apiFetch<InstitutionAiCostDetail>(month ? `${base}?month=${month}` : base);
}

export function formatUsd(n: number): string {
  const digits = n !== 0 && Math.abs(n) < 0.01 ? 4 : 2;
  return `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (n >= 1000) return `${Math.round(n / 1000)} k`;
  return String(n);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
