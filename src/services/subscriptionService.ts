import type {
  CreatePlanInput,
  Subscription,
  SubscriptionManagementStatus,
  SubscriptionPlan,
  UpdatePlanInput,
  UpdateSubscriptionInput,
} from '../types/subscription';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';

interface BackendSubscription {
  id: string;
  institutionId: string;
  institutionName: string;
  planId: string;
  planName?: string;
  monthlyPriceArs: number;
  expiresAt: string;
  daysUntilExpiration: number;
  managementStatus: string;
  durationMonths: number;
  customMaxUsers?: number | null;
  customMaxStudents?: number | null;
  customMaxCourses?: number | null;
  customStorageGb?: number | null;
  customFeatures?: any;
  customNotes?: string | null;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  effectiveMaxUsers?: number;
  effectiveMaxStudents?: number;
  effectiveMaxCourses?: number;
  effectiveStorageGb?: number;
  effectiveFeatures?: any;
}

function toSubscription(backend: BackendSubscription): Subscription {
  return {
    id: backend.id,
    institutionId: backend.institutionId,
    institutionName: backend.institutionName,
    planId: backend.planId,
    planName: backend.planName,
    monthlyPriceArs: backend.monthlyPriceArs,
    expiresAt: backend.expiresAt,
    daysUntilExpiration: backend.daysUntilExpiration,
    managementStatus: toLower<SubscriptionManagementStatus>(backend.managementStatus),
    durationMonths: backend.durationMonths,
    customMaxUsers: backend.customMaxUsers,
    customMaxStudents: backend.customMaxStudents,
    customMaxCourses: backend.customMaxCourses,
    customStorageGb: backend.customStorageGb,
    customFeatures: backend.customFeatures,
    customNotes: backend.customNotes,
    billingCycle: backend.billingCycle || 'MONTHLY',
    effectiveMaxUsers: backend.effectiveMaxUsers,
    effectiveMaxStudents: backend.effectiveMaxStudents,
    effectiveMaxCourses: backend.effectiveMaxCourses,
    effectiveStorageGb: backend.effectiveStorageGb,
    effectiveFeatures: backend.effectiveFeatures,
  };
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const backend = await apiFetch<BackendSubscription[]>('/subscriptions');
  return backend.map(toSubscription);
}

export async function listPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
  return apiFetch<SubscriptionPlan[]>(`/subscriptions/plans${includeInactive ? '?includeInactive=true' : ''}`);
}

export async function createPlan(input: CreatePlanInput): Promise<SubscriptionPlan> {
  return apiFetch<SubscriptionPlan>('/subscriptions/plans', {
    method: 'POST',
    body: input,
  });
}

export async function updatePlan(id: string, input: UpdatePlanInput): Promise<SubscriptionPlan> {
  return apiFetch<SubscriptionPlan>(`/subscriptions/plans/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deletePlan(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/subscriptions/plans/${id}`, {
    method: 'DELETE',
  });
}

export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput
): Promise<Subscription | undefined> {
  try {
    const payload: any = {
      ...input,
      managementStatus: input.managementStatus ? toUpper(input.managementStatus) : undefined,
    };
    const backend = await apiFetch<BackendSubscription>(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    return toSubscription(backend);
  } catch (err) {
    console.error('Error updating subscription:', err);
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
