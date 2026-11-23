import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import type { OAuthProviderId, Role } from '../types/auth';
import { t } from '../i18n';

export interface InstitutionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  provider: OAuthProviderId;
  active: boolean;
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

export type InvitationEmailStatus = 'sent' | 'simulated' | 'throttled' | 'failed';

export interface InvitationResult {
  user: InstitutionUser;
  email: InvitationEmailStatus;
}

export async function inviteInstitutionUser(
  institutionId: string,
  input: { name: string; email: string; role: Role; provider: OAuthProviderId },
): Promise<InvitationResult> {
  const backend = await apiFetch<BackendUser & { invitationEmail?: InvitationEmailStatus }>(`/institutions/${institutionId}/users`, {
    method: 'POST',
    body: { name: input.name, email: input.email, role: toUpper(input.role), provider: toUpper(input.provider) },
  });
  return { user: toUser(backend), email: backend.invitationEmail ?? 'sent' };
}

export function invitationEmailWarning(status: InvitationEmailStatus): string | null {
  switch (status) {
    case 'simulated':
      return t('Usuario creado, pero el correo no se envió porque el servicio de correo no está configurado. Avisale que ya puede ingresar.');
    case 'throttled':
      return t('Usuario creado, pero no se envió el correo: se alcanzó el límite de invitaciones a ese correo. Avisale que ya puede ingresar.');
    case 'failed':
      return t('Usuario creado, pero no se pudo enviar el correo. Avisale que ya puede ingresar.');
    default:
      return null;
  }
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
