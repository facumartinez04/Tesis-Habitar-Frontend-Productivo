export type SubscriptionManagementStatus = 'en_negociacion' | 'confirmado';

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPriceArs: number;
}

export interface Subscription {
  id: string;
  institutionId: string;
  institutionName: string;
  planId: string;
  monthlyPriceArs: number;
  expiresAt: string;
  daysUntilExpiration: number;
  managementStatus: SubscriptionManagementStatus;
  durationMonths: number;
}
