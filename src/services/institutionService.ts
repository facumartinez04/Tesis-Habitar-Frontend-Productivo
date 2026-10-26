import type {
  AiKeySource,
  AiProvider,
  ComprehensionAxis,
  EducationLevel,
  Institution,
  InstitutionStatus,
} from '../types/institution';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';

export interface CreateInstitutionInput {
  name: string;
  domain: string;
  levels: EducationLevel[];
  status: InstitutionStatus;
  coordinatorEmail: string;
}

interface BackendInstitution {
  id: string;
  slug: string;
  name: string;
  domain: string;
  status: string;
  coordinatorEmail: string;
  levels: string[];
  enabledAxes: string[];
  aiProvider?: string;
  aiKeySource?: string;
  aiCustomApiKeyMasked?: string | null;
  hasCustomApiKey?: boolean;
  aiModel?: string | null;
  studentIdMode?: 'LISTA' | 'NOMBRE';
  alertThreshold?: number;
  alertEmailsEnabled?: boolean;
  defaultLanguage?: string;
  readingMaxChars?: number;
  pausedAt?: string | null;
  pauseReason?: string | null;
  createdAt: string;
}

function toInstitution(backend: BackendInstitution): Institution {
  return {
    id: backend.id,
    slug: backend.slug,
    name: backend.name,
    domain: backend.domain,
    status: toLower<InstitutionStatus>(backend.status),
    coordinatorEmail: backend.coordinatorEmail,
    levels: backend.levels.map((level) => toLower<EducationLevel>(level)),
    enabledAxes: (backend.enabledAxes ?? []).map((axis) => toLower<ComprehensionAxis>(axis)),
    aiProvider: backend.aiProvider ? toLower<AiProvider>(backend.aiProvider) : 'deepseek',
    aiKeySource: backend.aiKeySource ? toLower<AiKeySource>(backend.aiKeySource) : 'platform',
    aiCustomApiKeyMasked: backend.aiCustomApiKeyMasked ?? null,
    hasCustomApiKey: Boolean(backend.hasCustomApiKey),
    aiModel: backend.aiModel ?? null,
    studentIdMode: backend.studentIdMode === 'NOMBRE' ? 'nombre' : 'lista',
    alertThreshold: backend.alertThreshold ?? 60,
    alertEmailsEnabled: backend.alertEmailsEnabled ?? true,
    defaultLanguage: backend.defaultLanguage === 'en' ? 'en' : 'es',
    readingMaxChars: backend.readingMaxChars ?? 5000,
    pausedAt: backend.pausedAt ?? null,
    pauseReason: backend.pauseReason ?? null,
    createdAt: backend.createdAt,
  };
}

export async function createInstitution(input: CreateInstitutionInput): Promise<Institution> {
  const backend = await apiFetch<BackendInstitution>('/institutions', {
    method: 'POST',
    body: {
      name: input.name,
      domain: input.domain,
      status: toUpper(input.status),
      coordinatorEmail: input.coordinatorEmail,
      levels: input.levels.map((level) => toUpper(level)),
    },
  });
  return toInstitution(backend);
}

export async function pauseInstitution(institutionId: string, reason: string | null): Promise<void> {
  await apiFetch(`/admin/institutions/${institutionId}/pause`, { method: 'POST', body: { reason } });
}

export async function resumeInstitution(institutionId: string): Promise<void> {
  await apiFetch(`/admin/institutions/${institutionId}/pause`, { method: 'DELETE' });
}

export async function listInstitutions(): Promise<Institution[]> {
  const backend = await apiFetch<BackendInstitution[]>('/institutions');
  return backend.map(toInstitution);
}

export async function getInstitutionBySlug(slug: string): Promise<Institution> {
  const backend = await apiFetch<BackendInstitution>(`/institutions/${slug}`);
  return toInstitution(backend);
}

export async function getInstitutionById(institutionId: string): Promise<Institution> {
  const backend = await apiFetch<BackendInstitution>(`/institutions/by-id/${institutionId}`);
  return toInstitution(backend);
}

export interface UpdateInstitutionConfigPayload {
  levels?: EducationLevel[];
  enabledAxes?: ComprehensionAxis[];
  aiProvider?: AiProvider;
  aiKeySource?: AiKeySource;
  aiCustomApiKey?: string | null;
  aiModel?: string | null;
  studentIdMode?: 'lista' | 'nombre';
  alertThreshold?: number;
  alertEmailsEnabled?: boolean;
  defaultLanguage?: 'es' | 'en';
  readingMaxChars?: number;
}

export async function updateInstitutionConfig(
  institutionId: string,
  input: UpdateInstitutionConfigPayload,
): Promise<Institution> {
  const backend = await apiFetch<BackendInstitution>(`/institutions/${institutionId}/config`, {
    method: 'PATCH',
    body: {
      levels: input.levels?.map((l) => toUpper(l)),
      enabledAxes: input.enabledAxes?.map((a) => toUpper(a)),
      aiProvider: input.aiProvider ? toUpper(input.aiProvider) : undefined,
      aiKeySource: input.aiKeySource ? toUpper(input.aiKeySource) : undefined,
      aiCustomApiKey: input.aiCustomApiKey,
      aiModel: input.aiModel,
      studentIdMode: input.studentIdMode ? toUpper(input.studentIdMode) : undefined,
      alertThreshold: input.alertThreshold,
      alertEmailsEnabled: input.alertEmailsEnabled,
      defaultLanguage: input.defaultLanguage,
      readingMaxChars: input.readingMaxChars,
    },
  });
  return toInstitution(backend);
}

export async function testAiConfig(
  institutionId: string,
  input: {
    provider: AiProvider;
    keySource: AiKeySource;
    apiKey?: string | null;
    model?: string | null;
  },
): Promise<{ success: boolean; modelUsed?: string; message?: string; error?: string }> {
  return apiFetch(`/institutions/${institutionId}/ai-config/test`, {
    method: 'POST',
    body: {
      provider: toUpper(input.provider),
      keySource: toUpper(input.keySource),
      apiKey: input.apiKey,
      model: input.model,
    },
  });
}

