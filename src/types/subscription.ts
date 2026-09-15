export type SubscriptionManagementStatus = 'en_negociacion' | 'confirmado';

export interface PlanFeatures {
  hasAiAnalytics: boolean;
  hasEarlyAlerts: boolean;
  hasArcoCompliance: boolean;
  hasCustomDomain: boolean;
  hasApiAccess: boolean;
  hasSlaSupport: boolean;
  hasExportReports: boolean;
  bullets: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPriceArs: number;
  annualPriceArs: number;
  maxUsers: number;
  maxStudents: number;
  maxCourses: number;
  storageGb: number;
  features: PlanFeatures;
  badge?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanInput {
  id?: string;
  name: string;
  description?: string;
  monthlyPriceArs: number;
  annualPriceArs?: number;
  maxUsers?: number;
  maxStudents?: number;
  maxCourses?: number;
  storageGb?: number;
  features?: Partial<PlanFeatures>;
  badge?: string;
  isActive?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  monthlyPriceArs?: number;
  annualPriceArs?: number;
  maxUsers?: number;
  maxStudents?: number;
  maxCourses?: number;
  storageGb?: number;
  features?: Partial<PlanFeatures>;
  badge?: string;
  isActive?: boolean;
}

export interface Subscription {
  id: string;
  institutionId: string;
  institutionName: string;
  planId: string;
  planName?: string;
  monthlyPriceArs: number;
  expiresAt: string;
  daysUntilExpiration: number;
  managementStatus: SubscriptionManagementStatus;
  durationMonths: number;

  customMaxUsers?: number | null;
  customMaxStudents?: number | null;
  customMaxCourses?: number | null;
  customStorageGb?: number | null;
  customFeatures?: Partial<PlanFeatures> | null;
  customNotes?: string | null;
  billingCycle?: 'MONTHLY' | 'ANNUAL';

  effectiveMaxUsers?: number;
  effectiveMaxStudents?: number;
  effectiveMaxCourses?: number;
  effectiveStorageGb?: number;
  effectiveFeatures?: PlanFeatures;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  monthlyPriceArs?: number;
  durationMonths?: number;
  managementStatus?: SubscriptionManagementStatus;
  customMaxUsers?: number | null;
  customMaxStudents?: number | null;
  customMaxCourses?: number | null;
  customStorageGb?: number | null;
  customFeatures?: Partial<PlanFeatures> | null;
  customNotes?: string | null;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
}
