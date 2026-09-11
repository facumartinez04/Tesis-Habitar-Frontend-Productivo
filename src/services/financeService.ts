import { apiFetch } from '../lib/apiClient';
import type {
  FinanceConfig,
  InstitutionExpense,
  InstitutionFee,
  InstitutionFinanceSummary,
  PaymentTransaction,
  PlatformExpense,
  PlatformFinanceSummary,
} from '../types/finance';

// --- PLATAFORMA (ADMIN) ---

export async function getPlatformFinanceSummary(): Promise<PlatformFinanceSummary> {
  return apiFetch<PlatformFinanceSummary>('/finances/platform/summary');
}

export async function listPlatformExpenses(): Promise<PlatformExpense[]> {
  return apiFetch<PlatformExpense[]>('/finances/platform/expenses');
}

export async function createPlatformExpense(data: {
  category: string;
  title: string;
  description?: string;
  amountArs: number;
  supplier?: string;
  status?: string;
  date?: string;
}): Promise<PlatformExpense> {
  return apiFetch<PlatformExpense>('/finances/platform/expenses', {
    method: 'POST',
    body: data,
  });
}

export async function deletePlatformExpense(id: string): Promise<void> {
  await apiFetch(`/finances/platform/expenses/${id}`, {
    method: 'DELETE',
  });
}

export async function listTransactions(): Promise<PaymentTransaction[]> {
  return apiFetch<PaymentTransaction[]>('/finances/platform/transactions');
}

export async function createSubscriptionCheckout(data: {
  institutionId?: string;
  subscriptionId?: string;
  planName: string;
  amountArs: number;
  payerEmail: string;
  payerName?: string;
}): Promise<{ transaction: PaymentTransaction; preferenceUrl: string }> {
  return apiFetch<{ transaction: PaymentTransaction; preferenceUrl: string }>('/finances/platform/checkout', {
    method: 'POST',
    body: data,
  });
}

export async function getPlatformFinanceConfig(): Promise<FinanceConfig> {
  return apiFetch<FinanceConfig>('/finances/platform/config');
}

export async function savePlatformFinanceConfig(data: {
  mpAccessToken: string;
  mpPublicKey: string;
  mpWebhookSecret?: string;
  mpIsSandbox?: boolean;
  autoInvoicing?: boolean;
}): Promise<FinanceConfig> {
  return apiFetch<FinanceConfig>('/finances/platform/config', {
    method: 'POST',
    body: data,
  });
}

export async function testMercadoPagoConnection(accessToken: string): Promise<{ success: boolean; message: string; user?: any }> {
  return apiFetch<{ success: boolean; message: string; user?: any }>('/finances/platform/mercadopago/test', {
    method: 'POST',
    body: { accessToken },
  });
}

// --- INSTITUCIÓN (CADA COLEGIO) ---

export async function getInstitutionFinanceSummary(institutionId: string): Promise<InstitutionFinanceSummary> {
  return apiFetch<InstitutionFinanceSummary>(`/finances/institution/${institutionId}/summary`);
}

export async function listInstitutionExpenses(institutionId: string): Promise<InstitutionExpense[]> {
  return apiFetch<InstitutionExpense[]>(`/finances/institution/${institutionId}/expenses`);
}

export async function createInstitutionExpense(institutionId: string, data: {
  category: string;
  title: string;
  description?: string;
  amountArs: number;
  supplier?: string;
  invoiceNumber?: string;
  status?: string;
  date?: string;
}): Promise<InstitutionExpense> {
  return apiFetch<InstitutionExpense>(`/finances/institution/${institutionId}/expenses`, {
    method: 'POST',
    body: data,
  });
}

export async function deleteInstitutionExpense(institutionId: string, id: string): Promise<void> {
  await apiFetch(`/finances/institution/${institutionId}/expenses/${id}`, {
    method: 'DELETE',
  });
}

export async function listInstitutionFees(institutionId: string): Promise<InstitutionFee[]> {
  return apiFetch<InstitutionFee[]>(`/finances/institution/${institutionId}/fees`);
}

export async function createInstitutionFee(institutionId: string, data: {
  courseId?: string;
  studentId?: string;
  title: string;
  period: string;
  amountArs: number;
  dueDate: string;
  tutorEmail?: string;
  tutorName?: string;
}): Promise<InstitutionFee> {
  return apiFetch<InstitutionFee>(`/finances/institution/${institutionId}/fees`, {
    method: 'POST',
    body: data,
  });
}

export async function updateInstitutionFeeStatus(institutionId: string, id: string, status: string): Promise<InstitutionFee> {
  return apiFetch<InstitutionFee>(`/finances/institution/${institutionId}/fees/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function getInstitutionFinanceConfig(institutionId: string): Promise<FinanceConfig> {
  return apiFetch<FinanceConfig>(`/finances/institution/${institutionId}/config`);
}

export async function saveInstitutionFinanceConfig(institutionId: string, data: {
  mpAccessToken: string;
  mpPublicKey: string;
  mpWebhookSecret?: string;
  mpIsSandbox?: boolean;
  autoInvoicing?: boolean;
}): Promise<FinanceConfig> {
  return apiFetch<FinanceConfig>(`/finances/institution/${institutionId}/config`, {
    method: 'POST',
    body: data,
  });
}
