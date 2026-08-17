export type Role = 'docente' | 'coordinador' | 'admin';

export type OAuthProviderId = 'google' | 'microsoft';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  institutionId: string;
}

export interface Session {
  user: User;
  provider: OAuthProviderId;
  issuedAt: string;
  token: string;
}
