import type { OAuthProviderId } from '../types/auth';
import type { IntegrationStep, IntegrationStepState, OAuthIntegration } from '../types/oauth';
import { apiFetch } from '../lib/apiClient';
import { toLower } from '../lib/caseAdapters';

interface BackendIntegrationStep {
  id: string;
  label: string;
  state: string;
  note?: string;
}

interface BackendOAuthIntegration {
  institutionId: string;
  provider: string;
  clientId: string;
  steps: BackendIntegrationStep[];
}

function toIntegration(backend: BackendOAuthIntegration): OAuthIntegration {
  return {
    institutionId: backend.institutionId,
    provider: toLower<OAuthProviderId>(backend.provider),
    clientId: backend.clientId,
    steps: backend.steps.map(
      (step): IntegrationStep => ({
        id: step.id,
        label: step.label,
        state: toLower<IntegrationStepState>(step.state),
        note: step.note,
      }),
    ),
  };
}

export async function getOAuthIntegration(institutionId: string): Promise<OAuthIntegration | undefined> {
  try {
    const backend = await apiFetch<BackendOAuthIntegration>(`/oauth/${institutionId}`);
    return toIntegration(backend);
  } catch {
    return undefined;
  }
}

export async function verifyIntegration(institutionId: string): Promise<OAuthIntegration | undefined> {
  try {
    const backend = await apiFetch<BackendOAuthIntegration>(`/oauth/${institutionId}/verify`, { method: 'POST' });
    return toIntegration(backend);
  } catch {
    return undefined;
  }
}

export async function resendInvitation(institutionId: string): Promise<void> {
  await apiFetch<void>(`/oauth/${institutionId}/resend`, { method: 'POST' });
}
