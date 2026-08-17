import type { ComprehensionAxis, EducationLevel, Institution, InstitutionStatus } from '../types/institution';
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

export async function updateInstitutionConfig(
  institutionId: string,
  input: { levels?: EducationLevel[]; enabledAxes?: ComprehensionAxis[] },
): Promise<void> {
  await apiFetch(`/institutions/${institutionId}/config`, {
    method: 'PATCH',
    body: {
      levels: input.levels?.map((l) => toUpper(l)),
      enabledAxes: input.enabledAxes?.map((a) => toUpper(a)),
    },
  });
}
