import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import type { OAuthProviderId, Role } from '../types/auth';

export interface InstitutionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  provider: OAuthProviderId;
  active: boolean;
  /** Fecha del último ingreso; null si fue invitado y todavía no ingresó. */
  lastLoginAt: string | null;
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  provider: string;
  active: boolean;
  lastLoginAt?: string | null;
}

function toUser(backend: BackendUser): InstitutionUser {
  return {
    id: backend.id,
    name: backend.name,
    email: backend.email,
    role: toLower<Role>(backend.role),
    provider: toLower<InstitutionUser['provider']>(backend.provider),
    active: backend.active,
    lastLoginAt: backend.lastLoginAt ?? null,
  };
}

export async function listInstitutionUsers(institutionId: string): Promise<InstitutionUser[]> {
  const backend = await apiFetch<BackendUser[]>(`/institutions/${institutionId}/users`);
  return backend.map(toUser);
}

export async function inviteInstitutionUser(
  institutionId: string,
  input: { name: string; email: string; role: Role; provider: OAuthProviderId },
): Promise<InstitutionUser> {
  const backend = await apiFetch<BackendUser>(`/institutions/${institutionId}/users`, {
    method: 'POST',
    body: { name: input.name, email: input.email, role: toUpper(input.role), provider: toUpper(input.provider) },
  });
  return toUser(backend);
}

export async function updateInstitutionUserRole(institutionId: string, userId: string, role: Role): Promise<InstitutionUser> {
  const backend = await apiFetch<BackendUser>(`/institutions/${institutionId}/users/${userId}/role`, {
    method: 'PATCH',
    body: { role: toUpper(role) },
  });
  return toUser(backend);
}

export async function setInstitutionUserActive(institutionId: string, userId: string, active: boolean): Promise<InstitutionUser> {
  const backend = await apiFetch<BackendUser>(`/institutions/${institutionId}/users/${userId}/active`, {
    method: 'PATCH',
    body: { active },
  });
  return toUser(backend);
}
