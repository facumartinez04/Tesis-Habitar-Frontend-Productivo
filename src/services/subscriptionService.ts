import type { Subscription, SubscriptionManagementStatus, SubscriptionPlan } from '../types/subscription';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';

interface BackendSubscription {
  id: string;
  institutionId: string;
  institutionName: string;
  planId: string;
  monthlyPriceArs: number;
  expiresAt: string;
  daysUntilExpiration: number;
  managementStatus: string;
  durationMonths: number;
}

function toSubscription(backend: BackendSubscription): Subscription {
  return {
    id: backend.id,
    institutionId: backend.institutionId,
    institutionName: backend.institutionName,
    planId: backend.planId,
    monthlyPriceArs: backend.monthlyPriceArs,
    expiresAt: backend.expiresAt,
    daysUntilExpiration: backend.daysUntilExpiration,
    managementStatus: toLower<SubscriptionManagementStatus>(backend.managementStatus),
    durationMonths: backend.durationMonths,
  };
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const backend = await apiFetch<BackendSubscription[]>('/subscriptions');
  return backend.map(toSubscription);
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return apiFetch<SubscriptionPlan[]>('/subscriptions/plans');
}

export interface UpdateSubscriptionInput {
  planId?: string;
  durationMonths?: number;
  managementStatus?: SubscriptionManagementStatus;
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription | undefined> {
  try {
    const backend = await apiFetch<BackendSubscription>(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: {
        planId: input.planId,
        durationMonths: input.durationMonths,
        managementStatus: input.managementStatus ? toUpper(input.managementStatus) : undefined,
      },
    });
    return toSubscription(backend);
  } catch {
    return undefined;
  }
}

export async function renewSubscription(id: string): Promise<Subscription | undefined> {
  try {
    const backend = await apiFetch<BackendSubscription>(`/subscriptions/${id}/renew`, { method: 'POST' });
    return toSubscription(backend);
  } catch {
    return undefined;
  }
}
