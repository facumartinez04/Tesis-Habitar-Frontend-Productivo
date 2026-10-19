import { apiFetch } from '../lib/apiClient';

export interface AiUsageSnapshot {
  institutionId: string;
  periodLabel: string;
  used: number;
  quota: number;
  remaining: number;
  overQuota: boolean;
  /** Gasto del mes con la clave de la plataforma, en dólares. */
  spentUsd?: number;
  /** Tope de gasto mensual en dólares (lo define el administrador de la plataforma); null = sin tope. */
  budgetUsd?: number | null;
  overBudget?: boolean;
}

export async function getAiUsage(institutionId: string): Promise<AiUsageSnapshot> {
  return apiFetch<AiUsageSnapshot>(`/institutions/${institutionId}/ai-usage`);
}
