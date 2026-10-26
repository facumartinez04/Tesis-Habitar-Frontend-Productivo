import type { Locale } from '../i18n';

export type Role = 'docente' | 'coordinador' | 'director' | 'admin';

export type OAuthProviderId = 'google' | 'microsoft';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  institutionId: string;
  language?: Locale | null;
}

export interface Session {
  user: User;
  provider: OAuthProviderId;
  issuedAt: string;
  token: string;
  institutionLanguage?: Locale;
  readingMaxChars?: number;
  impersonatedInstitutionId?: string;
  impersonatedInstitutionName?: string;
  impersonatedRole?: string;
}
