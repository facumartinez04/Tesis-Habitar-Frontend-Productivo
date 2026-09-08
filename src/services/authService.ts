import type { OAuthProviderId, Role, Session, User } from '../types/auth';
import { apiFetch } from '../lib/apiClient';
import { toLower, toUpper } from '../lib/caseAdapters';
import { sessionStore } from '../store/sessionStore';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:4000/api';

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

/** CU-01-01: URL a la que redirigir el navegador para arrancar el login real (Google/Microsoft). */
export function oauthLoginUrl(provider: OAuthProviderId): string {
  return `${API_URL}/auth/${toUpper(provider)}`;
}

/** Completa el login real: el backend ya redirigió acá con `?token=`, buscamos los datos del usuario y armamos la sesión. */
export async function completeOAuthCallback(token: string): Promise<Session> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('No se pudo completar el inicio de sesión');

  const { user } = (await response.json()) as { user: BackendUser };
  const session: Session = {
    token,
    user: toUser(user),
    provider: toLower<OAuthProviderId>(user.provider),
    issuedAt: new Date().toISOString(),
  };
  sessionStore.set(session);
  return session;
}

/** Vuelve a pedirle al backend los datos actuales del usuario (rol, institución, activo) y
 *  actualiza la sesión guardada. El token queda igual — lo que puede cambiar es lo que el
 *  usuario tiene permitido hacer, y eso vive en la DB, no en el JWT cacheado en localStorage. */
export async function refreshSession(): Promise<Session | null> {
  const current = sessionStore.get();
  if (!current?.token) return null;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${current.token}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        if (current.user.role === 'admin') {
          return ensureAdminSession();
        }
        sessionStore.set(null);
        return null;
      }
      return current;
    }

    const { user } = (await response.json()) as { user: BackendUser };
    const session: Session = {
      ...current,
      user: toUser(user),
      provider: toLower<OAuthProviderId>(user.provider),
    };
    sessionStore.set(session);
    return session;
  } catch {
    return current;
  }
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
