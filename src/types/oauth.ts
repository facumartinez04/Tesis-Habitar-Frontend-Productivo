import type { InstitutionStatus } from './institution';

export interface OAuthAccessStatus {
  institutionId: string;
  domain: string;
  coordinatorEmail: string;
  institutionStatus: InstitutionStatus;
  googleConfigured: boolean;
  microsoftConfigured: boolean;
  microsoftTenantId: string | null;
}
