import { apiFetch } from '../lib/apiClient';

export interface AiUsageSnapshot {
  institutionId: string;
  periodLabel: string;
  used: number;
  quota: number;
  remaining: number;
  overQuota: boolean;
}

export async function getAiUsage(institutionId: string): Promise<AiUsageSnapshot> {
  return apiFetch<AiUsageSnapshot>(`/institutions/${institutionId}/ai-usage`);
}
