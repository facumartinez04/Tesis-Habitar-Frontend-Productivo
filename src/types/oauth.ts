import type { InstitutionStatus } from './institution';

export interface OAuthAccessStatus {
  institutionId: string;
  domain: string;
  coordinatorEmail: string;
  institutionStatus: InstitutionStatus;
  googleConfigured: boolean;
  microsoftConfigured: boolean;
  /** Organización (tenant) de Microsoft Entra de la institución; sin ella no se ingresa con Microsoft 365. */
  microsoftTenantId: string | null;
}
