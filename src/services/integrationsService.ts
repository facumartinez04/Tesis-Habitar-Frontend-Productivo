import { apiFetch } from '../lib/apiClient';

export interface IntegrationsConfig {
  googleDrive: { clientId: string; apiKey: string; appId: string } | null;
  oneDrive: { clientId: string; tenantId: string } | null;
}

let cached: Promise<IntegrationsConfig> | null = null;

/** Identificadores públicos de Google Drive y OneDrive (sin secretos), configurados en el servidor. */
export function getIntegrationsConfig(): Promise<IntegrationsConfig> {
  if (!cached) {
    cached = apiFetch<IntegrationsConfig>('/auth/integrations', { auth: false }).catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
