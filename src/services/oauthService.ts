import type { InstitutionStatus } from '../types/institution';
import type { OAuthAccessStatus } from '../types/oauth';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendOAuthAccessStatus {
  institutionId: string;
  domain: string;
  coordinatorEmail: string;
  institutionStatus: string;
  googleConfigured: boolean;
  microsoftConfigured: boolean;
}

function toStatus(backend: BackendOAuthAccessStatus): OAuthAccessStatus {
  return {
    institutionId: backend.institutionId,
    domain: backend.domain,
    coordinatorEmail: backend.coordinatorEmail,
    institutionStatus: toLower<InstitutionStatus>(backend.institutionStatus),
    googleConfigured: backend.googleConfigured,
    microsoftConfigured: backend.microsoftConfigured,
  };
}

export async function getOAuthAccessStatus(institutionId: string): Promise<OAuthAccessStatus> {
  const backend = await apiFetch<BackendOAuthAccessStatus>(`/oauth/${institutionId}`);
  return toStatus(backend);
}

export async function activateOAuthAccess(institutionId: string): Promise<OAuthAccessStatus> {
  const backend = await apiFetch<BackendOAuthAccessStatus>(`/oauth/${institutionId}/activate`, { method: 'POST' });
  return toStatus(backend);
}

export async function deactivateOAuthAccess(institutionId: string): Promise<OAuthAccessStatus> {
  const backend = await apiFetch<BackendOAuthAccessStatus>(`/oauth/${institutionId}/deactivate`, { method: 'POST' });
  return toStatus(backend);
}
