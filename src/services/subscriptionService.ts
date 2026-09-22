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

export const DEFAULT_PUBLIC_PLANS: SubscriptionPlan[] = [
  {
    id: 'piloto',
    name: 'Piloto Gratuito',
    description: 'Plan inicial sin costo para validación institucional durante 60 días en escuelas.',
    monthlyPriceArs: 0,
    annualPriceArs: 0,
    maxUsers: 15,
    maxStudents: 150,
    maxCourses: 8,
    storageGb: 5,
    badge: 'Piloto 60 Días',
    isActive: true,
    features: {
      hasAiAnalytics: false,
      hasEarlyAlerts: true,
      hasArcoCompliance: true,
      hasCustomDomain: false,
      hasApiAccess: false,
      hasSlaSupport: false,
      hasExportReports: true,
      bullets: [
        'Hasta 15 docentes',
        '150 alumnos incluidos',
        '8 aulas físicas con QR permanente',
        '5 GB de almacenamiento',
        'Alertas tempranas de asistencia y comprensión',
        'Cumplimiento normativo ARCO y consentimiento',
      ],
    },
  },
  {
    id: 'estandar',
    name: 'Plan Estándar',
    description: 'Ideal para escuelas medianas que buscan digitalizar y elevar el seguimiento pedagógico.',
    monthlyPriceArs: 120000,
    annualPriceArs: 1200000,
    maxUsers: 50,
    maxStudents: 600,
    maxCourses: 25,
    storageGb: 20,
    badge: 'Más Elegido',
    isActive: true,
    features: {
      hasAiAnalytics: false,
      hasEarlyAlerts: true,
      hasArcoCompliance: true,
      hasCustomDomain: false,
      hasApiAccess: false,
      hasSlaSupport: true,
      hasExportReports: true,
      bullets: [
        'Hasta 50 docentes',
        '600 alumnos incluidos',
        '25 aulas físicas con QR permanente',
        '20 GB de almacenamiento',
        'Exportación completa a Excel y reportes PDF',
        'Soporte prioritario por email y mesa de ayuda',
        'Alertas tempranas avanzadas y comparador de períodos',
      ],
    },
  },
  {
    id: 'premium',
    name: 'Premium Institucional',
    description: 'Para colegios de alta exigencia que requieren analítica predictiva de IA y máxima escala.',
    monthlyPriceArs: 220000,
    annualPriceArs: 2200000,
    maxUsers: 150,
    maxStudents: 1800,
    maxCourses: 80,
    storageGb: 100,
    badge: 'Recomendado',
    isActive: true,
    features: {
      hasAiAnalytics: true,
      hasEarlyAlerts: true,
      hasArcoCompliance: true,
      hasCustomDomain: true,
      hasApiAccess: true,
      hasSlaSupport: true,
      hasExportReports: true,
      bullets: [
        'Docentes ilimitados (hasta 150)',
        '1.800 alumnos incluidos',
        '80 aulas físicas con QR permanente',
        '100 GB de almacenamiento',
        'Analítica predictiva con IA en 3 ejes cognitivos',
        'Dominio institucional personalizado (Marca Blanca)',
        'Acceso a API REST y Webhooks para SIU/Sistemas',
        'SLA con soporte telefónico y asesor pedagógico dedicado',
      ],
    },
  },
];

export async function listPublicPlans(): Promise<SubscriptionPlan[]> {
  try {
    const plans = await apiFetch<SubscriptionPlan[]>('/subscriptions/plans/public');
    if (Array.isArray(plans) && plans.length > 0) {
      return plans.filter((p) => p.isActive);
    }
    return DEFAULT_PUBLIC_PLANS;
  } catch {
    return DEFAULT_PUBLIC_PLANS;
  }
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
