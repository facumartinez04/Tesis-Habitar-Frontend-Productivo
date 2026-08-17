import type { OAuthProviderId } from './auth';

export type IntegrationStepState = 'done' | 'wait' | 'todo';

export interface IntegrationStep {
  id: string;
  label: string;
  state: IntegrationStepState;
  note?: string;
}

export interface OAuthIntegration {
  institutionId: string;
  provider: OAuthProviderId;
  clientId: string;
  steps: IntegrationStep[];
}
