import type { OAuthProviderId, Role, Session, User } from '../types/auth';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import { sessionStore } from '../store/sessionStore';

interface BackendUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
  provider: string;
  institutionId: string;
}

interface BackendSession {
  token: string;
  user: BackendUser;
  dashboardPath: string;
}

function toUser(backendUser: BackendUser): User {
  return {
    id: backendUser.id,
    name: backendUser.name,
    initials: backendUser.initials,
    email: backendUser.email,
    role: toLower<Role>(backendUser.role),
    institutionId: backendUser.institutionId,
  };
}

function toSession(backendSession: BackendSession): Session {
  return {
    token: backendSession.token,
    user: toUser(backendSession.user),
    provider: toLower<OAuthProviderId>(backendSession.user.provider),
    issuedAt: new Date().toISOString(),
  };
}

export async function loginWithProvider(provider: OAuthProviderId): Promise<Session> {
  const backendSession = await apiFetch<BackendSession>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { provider: toUpper(provider) },
  });
  return toSession(backendSession);
}

export async function ensureAdminSession(): Promise<Session> {
  const current = sessionStore.get();
  if (current?.user.role === 'admin') return current;

  const backendSession = await apiFetch<BackendSession>('/auth/admin-session', {
    method: 'POST',
    auth: false,
  });
  const session = toSession(backendSession);
  sessionStore.set(session);
  return session;
}

export function dashboardPathForRole(role: Role): string {
  if (role === 'admin') return '/admin/instituciones/nueva';
  if (role === 'coordinador') return '/institucional';
  return '/docente/cursos';
}
